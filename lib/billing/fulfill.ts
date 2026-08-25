import { supabaseAdmin } from "@/lib/db/client";
import { getPlan, BUNDLE_CREDITS } from "@/lib/billing/plans";
import { ANY_REPORT_PASS } from "@/lib/billing/access";

/**
 * 승인이 끝난 결제를 실제 권한으로 바꾼다 (이용권 발급 또는 구독 연장).
 *
 * 리다이렉트 경로(/api/payments/confirm)와 웹훅 복구 경로 양쪽에서 호출되므로
 * 반드시 멱등해야 한다 — one_time_purchases.order_id UNIQUE 제약에 걸리면
 * "이미 처리된 결제"로 보고 성공으로 돌려준다.
 */
export async function fulfillPayment(opts: {
  userId: string;
  planId: string;
  orderId: string;
  paymentKey: string;
}): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const { userId, planId, orderId, paymentKey } = opts;
  const plan = getPlan(planId);
  if (!plan) return { ok: false, error: "알 수 없는 플랜" };

  if (plan.kind === "one_time") {
    const credits = BUNDLE_CREDITS[plan.id] ?? 1;
    const productId = credits > 1 ? ANY_REPORT_PASS : plan.id;
    const rows = Array.from({ length: credits }, (_, i) => ({
      user_id: userId,
      product_id: productId,
      amount: plan.amount,
      order_id: credits > 1 ? `${orderId}-${i + 1}` : orderId,
      payment_key: paymentKey,
    }));

    const { error } = await supabaseAdmin.from("one_time_purchases").insert(rows);
    if (error) {
      // 23505 = order_id UNIQUE 충돌 = 같은 결제가 이미 기록돼 있다.
      // 리다이렉트와 웹훅이 모두 도착한 정상 상황이므로 성공으로 취급한다.
      if (error.code === "23505") {
        await markOrderDone(orderId, paymentKey);
        return { ok: true, duplicate: true };
      }
      console.error("[payment_save_failed]", JSON.stringify({ userId, orderId, paymentKey, dbError: error }));
      return { ok: false, error: "구매 기록 저장 실패" };
    }
    await markOrderDone(orderId, paymentKey);
    return { ok: true };
  }

  // 구독: 기존 active가 있으면 남은 기간 위에 연장, 없으면 새로 삽입
  const expiresAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const base =
      existing.expires_at && new Date(existing.expires_at).getTime() > Date.now()
        ? new Date(existing.expires_at).getTime()
        : Date.now();
    const extended = new Date(base + plan.days * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("subscriptions")
      .update({ plan: plan.id, expires_at: extended, status: "active", order_id: orderId, payment_key: paymentKey })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      status: "active",
      plan: plan.id,
      expires_at: expiresAt,
      order_id: orderId,
      payment_key: paymentKey,
    });
  }

  await markOrderDone(orderId, paymentKey);
  return { ok: true };
}

/** payment_orders를 done으로 표시. 테이블이 없거나 실패해도 결제 자체를 막지 않는다. */
export async function markOrderDone(orderId: string, paymentKey: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "done", payment_key: paymentKey, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
  } catch {
    /* noop */
  }
}
