import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/db/client";

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
    if (eventType === "PAYMENT_STATUS_CHANGED" && data?.status && CANCEL_STATUSES.has(data.status)) {
      const { orderId, paymentKey } = data;
      const query = supabaseAdmin.from("subscriptions").update({ status: "canceled" });
      const { error } = orderId
        ? await query.eq("order_id", orderId)
        : await query.eq("payment_key", paymentKey ?? "__none__");
      if (error) console.error("toss webhook: subscription update error", error);
      else console.log(`toss webhook: subscription canceled (order=${orderId}, status=${data.status})`);
    }
  } catch (e) {
    console.error("toss webhook processing error:", e);
  }

  // Toss는 200 응답을 받아야 재시도하지 않으므로, 내부 처리 실패와 무관하게 수신 확인은 항상 반환
  return NextResponse.json({ received: true });
}
