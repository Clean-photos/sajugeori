/**
 * 토스 결제 조회 — 웹훅 본문을 믿지 않고 우리 시크릿 키로 직접 상태를 확인한다.
 * 결제 승인 복구(DONE)뿐 아니라 취소 반영(CANCELED 등)도 이 조회를 거친다(2026-10-04 점검:
 * 취소 경로는 본문만 믿고 구독·이용권을 회수하고 있었다. 서명 시크릿이 없는 환경이라 위조 가능).
 */
export type TossLookup =
  | { ok: true; status: string; paymentKey: string; totalAmount: number }
  | { ok: false; notFound: boolean; reason: string };

export async function fetchTossPayment(
  key: { orderId?: string; paymentKey?: string },
  secretKey: string | undefined = process.env.TOSS_SECRET_KEY,
  fetchImpl: typeof fetch = fetch
): Promise<TossLookup> {
  if (!secretKey) return { ok: false, notFound: false, reason: "secret_key_missing" };
  const path = key.orderId
    ? `orders/${encodeURIComponent(key.orderId)}`
    : key.paymentKey
      ? encodeURIComponent(key.paymentKey)
      : null;
  if (!path) return { ok: false, notFound: true, reason: "no_identifier" };
  try {
    const basic = Buffer.from(`${secretKey}:`).toString("base64");
    const res = await fetchImpl(`https://api.tosspayments.com/v1/payments/${path}`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const payment = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, notFound: res.status === 404, reason: payment?.code ?? `http_${res.status}` };
    return {
      ok: true,
      status: String(payment?.status ?? ""),
      paymentKey: payment?.paymentKey ?? "",
      totalAmount: Number(payment?.totalAmount),
    };
  } catch (e) {
    return { ok: false, notFound: false, reason: e instanceof Error ? e.message : "fetch_error" };
  }
}
