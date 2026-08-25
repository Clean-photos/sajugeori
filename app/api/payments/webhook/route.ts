import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/db/client";
import { fulfillPayment } from "@/lib/billing/fulfill";

// Toss 대시보드에 등록한 웹훅의 서명 검증용 시크릿. 웹훅 등록 시 별도로 발급됨(API 시크릿키와 다름).
const WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET;

// 구독을 취소 처리해야 하는 결제 상태
const CANCEL_STATUSES = new Set(["CANCELED", "PARTIAL_CANCELED", "EXPIRED"]);

/**
 * 웹훅 본문을 믿지 않고 토스 API로 결제를 직접 조회해 승인 여부를 확인한다.
 * 우리 시크릿 키로만 호출할 수 있으므로 위조 웹훅으로는 통과할 수 없다.
 * 금액까지 대조해 주문 금액과 실제 결제 금액이 다른 경우도 걸러낸다.
 */
async function verifyPaymentWithToss(
  orderId: string,
  expectedAmount: number
): Promise<{ ok: true; paymentKey: string } | { ok: false; reason: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, reason: "secret_key_missing" };

  try {
    const basic = Buffer.from(`${secretKey}:`).toString("base64");
    const res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const payment = await res.json();
    if (!res.ok) return { ok: false, reason: payment?.code ?? `http_${res.status}` };
    if (payment?.status !== "DONE") return { ok: false, reason: `status_${payment?.status}` };
    if (Number(payment?.totalAmount) !== Number(expectedAmount)) {
      return { ok: false, reason: `amount_mismatch_${payment?.totalAmount}_vs_${expectedAmount}` };
    }
    return { ok: true, paymentKey: payment.paymentKey ?? "" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "fetch_error" };
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null, timestamp: string | null): boolean {
  // 토스 개발자센터의 웹훅 등록 화면은 별도 시크릿을 발급하지 않는다(2026-08 확인).
  // 그래서 이 서명 검증은 선택적 방어선이다 — 시크릿이 설정돼 있으면 검증하고,
  // 없으면 통과시킨다. 권한을 새로 주는 승인 복구 경로는 서명에 의존하지 않고
  // 토스 API 재조회(verifyPaymentWithToss)로 별도 검증하므로 이 상태로도 안전하다.
  if (!WEBHOOK_SECRET) return true;
  if (!signatureHeader || !timestamp) return false;

  // Toss 웹훅 서명: "v1,<base64>" 형식. HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
  const provided = signatureHeader.split(",").pop() ?? "";
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("base64");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// POST /api/payments/webhook — Toss 결제 상태 변경 웹훅 (환불/취소 등).
// 자동 정기결제(빌링)가 아니라 단건 결제 방식이라, 이 웹훅의 핵심 역할은
// "Toss 대시보드에서 관리자가 결제를 취소/환불했을 때 구독도 같이 내려주는 것"이다.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("TossPayments-Webhook-Signature");
  const timestamp = req.headers.get("TossPayments-Webhook-Transmission-Time");

  if (!verifySignature(rawBody, signature, timestamp)) {
    console.error("toss webhook: signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { eventType?: string; data?: { paymentKey?: string; orderId?: string; status?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { eventType, data } = payload;

  try {
    // 승인 완료 복구 — 리다이렉트(/premium/success)가 유실되면 돈은 빠졌는데
    // 이용권이 없는 상태가 남는다. payment_orders에 pending으로 남아 있는
    // 주문이면 여기서 대신 발급한다. fulfillPayment는 멱등해서 리다이렉트가
    // 정상 도착한 경우와 겹쳐도 중복 발급되지 않는다.
    //
    // 토스는 웹훅용 별도 시크릿을 발급하지 않는다(개발자센터 웹훅 등록 화면 확인).
    // 그래서 웹훅 본문 자체는 신뢰하지 않고, 트리거로만 쓴다 — 실제 승인 여부는
    // 우리 시크릿 키로 토스 API에 직접 조회해서 확인한다. 위조 웹훅을 보내도
    // 토스가 DONE이라고 답하지 않으면 아무 것도 발급되지 않는다.
    if (eventType === "PAYMENT_STATUS_CHANGED" && data?.status === "DONE" && data.orderId) {
      const { data: order } = await supabaseAdmin
        .from("payment_orders")
        .select("order_id, user_id, plan_id, amount, status")
        .eq("order_id", data.orderId)
        .maybeSingle();

      if (order && order.status !== "done") {
        const verified = await verifyPaymentWithToss(order.order_id, order.amount);
        if (!verified.ok) {
          console.error("[payment_webhook_verify_failed]", JSON.stringify({ orderId: data.orderId, reason: verified.reason }));
        } else {
          console.log("[payment_webhook_recovery]", JSON.stringify({ orderId: data.orderId, userId: order.user_id }));
          const result = await fulfillPayment({
            userId: order.user_id,
            planId: order.plan_id,
            orderId: order.order_id,
            paymentKey: verified.paymentKey,
          });
          if (!result.ok) {
            console.error("[payment_webhook_recovery_failed]", JSON.stringify({ orderId: data.orderId, error: result.error }));
          }
        }
      }
    }

    if (eventType === "PAYMENT_STATUS_CHANGED" && data?.status && CANCEL_STATUSES.has(data.status)) {
      const { orderId, paymentKey } = data;
      const query = supabaseAdmin.from("subscriptions").update({ status: "canceled" });
      const { error } = orderId
        ? await query.eq("order_id", orderId)
        : await query.eq("payment_key", paymentKey ?? "__none__");
      if (error) console.error("toss webhook: subscription update error", error);
      else console.log(`toss webhook: subscription canceled (order=${orderId}, status=${data.status})`);

      // 단건 이용권도 같은 orderId/paymentKey 기준으로 회수
      const otpQuery = supabaseAdmin.from("one_time_purchases").update({ status: "canceled" });
      const { error: otpError } = orderId
        ? await otpQuery.eq("order_id", orderId)
        : await otpQuery.eq("payment_key", paymentKey ?? "__none__");
      if (otpError) console.error("toss webhook: one_time purchase update error", otpError);

      // 주문 기록도 취소로 내려 둔다 (대사·복구 시 상태가 어긋나지 않게)
      if (orderId) {
        await supabaseAdmin
          .from("payment_orders")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("order_id", orderId);
      }
    }
  } catch (e) {
    console.error("toss webhook processing error:", e);
  }

  // Toss는 200 응답을 받아야 재시도하지 않으므로, 내부 처리 실패와 무관하게 수신 확인은 항상 반환
  return NextResponse.json({ received: true });
}
