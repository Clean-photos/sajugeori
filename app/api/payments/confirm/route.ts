import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { getPlan, BUNDLE_CREDITS } from "@/lib/billing/plans";
import { ANY_REPORT_PASS } from "@/lib/billing/access";

// POST /api/payments/confirm
// Toss Payments 결제 승인 → 구독 활성화
// body: { paymentKey, orderId, amount, planId }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { paymentKey, orderId, amount, planId } = await req.json();
  if (!paymentKey || !orderId || !amount || !planId) {
    return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "알 수 없는 플랜" }, { status: 400 });
  }

  // 금액 위변조 방지: 서버가 아는 플랜 금액과 일치해야 함
  if (Number(amount) !== plan.amount) {
    return NextResponse.json({ error: "결제 금액 불일치" }, { status: 400 });
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "결제 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  // Toss 결제 승인 API 호출 (Basic auth: secretKey + ":")
  const basic = Buffer.from(`${secretKey}:`).toString("base64");
  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const payment = await tossRes.json();
  if (!tossRes.ok) {
    // 승인 자체가 실패 — 과금 없음. DB에 남길 것도 없다.
    return NextResponse.json(
      { error: payment?.message ?? "결제 승인 실패", code: payment?.code, stage: "confirm" },
      { status: 402 }
    );
  }

  // 승인은 여기서부터 완료된 상태 — 과금이 실제로 발생했다. 이후 DB 저장이
  // 실패해도 이 결제 자체를 잃어버리면 안 되므로, 어떤 경로로도 서버 로그에
  // 반드시 남긴다(대사·복구의 유일한 근거).
  console.log("[payment_confirmed]", JSON.stringify({
    userId, orderId, paymentKey, amount: payment.totalAmount ?? amount, planId,
    approvedAt: payment.approvedAt, method: payment.method,
  }));

  // 단건 이용권: 소진형 구매 기록만 남긴다 (구독 아님)
  if (plan.kind === "one_time") {
    // 묶음권은 아무 리포트에나 쓸 수 있는 이용권을 장수만큼 발급한다.
    // 단품은 해당 리포트 전용 이용권 1장.
    const credits = BUNDLE_CREDITS[plan.id] ?? 1;
    const productId = credits > 1 ? ANY_REPORT_PASS : plan.id;
    const rows = Array.from({ length: credits }, (_, i) => ({
      user_id: userId,
      product_id: productId,
      amount: plan.amount,
      // order_id에 unique 제약이 있어 묶음권은 장별로 접미사를 붙인다
      order_id: credits > 1 ? `${orderId}-${i + 1}` : orderId,
      payment_key: paymentKey,
    }));

    const { error } = await supabaseAdmin.from("one_time_purchases").insert(rows);
    if (error) {
      // 23505 = order_id UNIQUE 충돌 = 같은 결제가 이미 기록돼 있다는 뜻
      // (성공 후 페이지 새로고침·중복 요청 등). 실패가 아니라 이미 처리된 결제이므로
      // 성공으로 응답한다 — 안 그러면 정상 결제인데도 "저장 실패" 화면을 보게 된다.
      if (error.code === "23505") {
        console.log("[payment_duplicate_confirm]", JSON.stringify({ userId, orderId, paymentKey }));
        return NextResponse.json({ ok: true, plan: plan.id, kind: "one_time", credits, duplicate: true });
      }
      // 그 외 진짜 저장 실패 — 승인된 결제(위 로그 참고)이므로 문의 시 orderId로 대사 가능
      console.error("[payment_save_failed]", JSON.stringify({ userId, orderId, paymentKey, dbError: error }));
      return NextResponse.json(
        { error: "결제는 확인되었으나 처리 중 문제가 발생했습니다.", orderId, stage: "save", charged: true },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, plan: plan.id, kind: "one_time", credits });
  }

  // 구독 활성화 (단건 → expires_at = now + plan.days)
  const expiresAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000).toISOString();

  // 기존 active 구독이 있으면 만료일 연장, 없으면 새로 삽입
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id, expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // 남은 기간이 있으면 그 위에 더해 연장
    const base = existing.expires_at && new Date(existing.expires_at).getTime() > Date.now()
      ? new Date(existing.expires_at).getTime()
      : Date.now();
    const extended = new Date(base + plan.days * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("subscriptions")
      .update({ plan: plan.id, expires_at: extended, status: "active", order_id: orderId, payment_key: paymentKey })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("subscriptions")
      .insert({ user_id: userId, status: "active", plan: plan.id, expires_at: expiresAt, order_id: orderId, payment_key: paymentKey });
  }

  return NextResponse.json({ ok: true, plan: plan.id, expires_at: expiresAt });
}
