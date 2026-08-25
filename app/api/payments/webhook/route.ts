import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/db/client";
import { fulfillPayment } from "@/lib/billing/fulfill";

// Toss 대시보드에 등록한 웹훅의 서명 검증용 시크릿. 웹훅 등록 시 별도로 발급됨(API 시크릿키와 다름).
const WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET;

// 구독을 취소 처리해야 하는 결제 상태
const CANCEL_STATUSES = new Set(["CANCELED", "PARTIAL_CANCELED", "EXPIRED"]);

function verifySignature(rawBody: string, signatureHeader: string | null, timestamp: string | null): boolean {
  if (!WEBHOOK_SECRET) return true; // 시크릿 미설정(웹훅 미등록 상태) — 확인 없이 통과, 등록 후 필수화
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
    // 복구는 "권한을 새로 주는" 동작이라 서명 검증이 반드시 살아 있어야 한다.
    // 시크릿이 없으면 위조 웹훅으로 결제 없이 이용권을 받아갈 수 있으므로 건너뛴다.
    // (반대로 아래 취소 처리는 권한을 회수하기만 하므로 시크릿 없이도 수행한다.)
    if (!WEBHOOK_SECRET && eventType === "PAYMENT_STATUS_CHANGED" && data?.status === "DONE") {
      console.error("toss webhook: TOSS_WEBHOOK_SECRET 미설정 — 승인 복구를 건너뜁니다");
    }
    if (WEBHOOK_SECRET && eventType === "PAYMENT_STATUS_CHANGED" && data?.status === "DONE" && data.orderId) {
      const { data: order } = await supabaseAdmin
        .from("payment_orders")
        .select("order_id, user_id, plan_id, status")
        .eq("order_id", data.orderId)
        .maybeSingle();

      if (order && order.status !== "done") {
        console.log("[payment_webhook_recovery]", JSON.stringify({ orderId: data.orderId, userId: order.user_id }));
        const result = await fulfillPayment({
          userId: order.user_id,
          planId: order.plan_id,
          orderId: order.order_id,
          paymentKey: data.paymentKey ?? "",
        });
        if (!result.ok) {
          console.error("[payment_webhook_recovery_failed]", JSON.stringify({ orderId: data.orderId, error: result.error }));
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
