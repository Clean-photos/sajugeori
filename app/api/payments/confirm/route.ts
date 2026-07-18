import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { getPlan } from "@/lib/billing/plans";

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
    return NextResponse.json(
      { error: payment?.message ?? "결제 승인 실패", code: payment?.code },
      { status: 402 }
    );
  }

  // 단건 이용권: 소진형 구매 기록만 남긴다 (구독 아님)
  if (plan.kind === "one_time") {
    const { error } = await supabaseAdmin
      .from("one_time_purchases")
      .insert({ user_id: userId, product_id: plan.id, amount: plan.amount, order_id: orderId, payment_key: paymentKey });
    if (error) {
      // 승인은 이미 완료된 상태 — 기록 실패는 로그로 남기고 실패 응답 (Toss 대시보드에서 수동 대사 가능)
      console.error("one_time purchase insert error:", error);
      return NextResponse.json({ error: "구매 기록 저장에 실패했습니다. 문의해주세요." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, plan: plan.id, kind: "one_time" });
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
