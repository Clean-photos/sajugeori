import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlan } from "@/lib/billing/plans";
import { fulfillPayment } from "@/lib/billing/fulfill";

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

  // 이용권 발급/구독 연장은 웹훅 복구 경로와 공유한다(lib/billing/fulfill.ts).
  const result = await fulfillPayment({ userId, planId: plan.id, orderId, paymentKey });
  if (!result.ok) {
    return NextResponse.json(
      { error: "결제는 확인되었으나 처리 중 문제가 발생했습니다.", orderId, stage: "save", charged: true },
      { status: 500 }
    );
  }
  if (result.duplicate) {
    console.log("[payment_duplicate_confirm]", JSON.stringify({ userId, orderId, paymentKey }));
  }

  return NextResponse.json({ ok: true, plan: plan.id, duplicate: result.duplicate ?? false });
}
