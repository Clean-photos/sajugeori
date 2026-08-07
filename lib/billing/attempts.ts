import { supabaseAdmin } from "@/lib/db/client";

export type StartAttemptResult =
  | { ok: true; attemptId: string | null; input: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/**
 * 리포트 생성 시도를 시작한다 (결제-생성 원자성의 핵심).
 *
 * - attemptId 없이 호출(최초 생성): 입력값을 premium_generation_attempts에
 *   저장하고 pending 상태로 만든다. 같은 (user, product)에 이미 pending 행이
 *   있으면(더블클릭 레이스) 409로 막는다.
 * - attemptId와 함께 호출(재생성): 저장된 input을 그대로 돌려주므로 호출부는
 *   클라이언트가 다시 보낸 값을 무시하고 이 input을 써야 한다. 이미 pending이면
 *   막고, done/failed였던 행은 pending으로 되돌려 재시도를 허용한다.
 *
 * 테이블이 없거나 조회에 실패하면 잠금 없이 통과시킨다(attemptId: null) —
 * 이 경우 finishAttempt*는 호출부에서 건너뛰어야 한다.
 */
export async function startAttempt(
  userId: string,
  productId: string,
  attemptId: string | undefined,
  freshInput: Record<string, unknown>
): Promise<StartAttemptResult> {
  try {
    if (attemptId) {
      const { data, error } = await supabaseAdmin
        .from("premium_generation_attempts")
        .select("id, input, status")
        .eq("id", attemptId).eq("user_id", userId).eq("product_id", productId)
        .single();
      if (error || !data) {
        return { ok: false, status: 404, error: "재생성할 요청을 찾을 수 없습니다. 처음부터 다시 시도해주세요." };
      }
      if (data.status === "pending") {
        return { ok: false, status: 409, error: "이미 생성 중입니다. 잠시 후 다시 시도해주세요." };
      }
      await supabaseAdmin
        .from("premium_generation_attempts")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", attemptId);
      return { ok: true, attemptId, input: (data.input as Record<string, unknown>) ?? freshInput };
    }

    const { data, error } = await supabaseAdmin
      .from("premium_generation_attempts")
      .insert({ user_id: userId, product_id: productId, input: freshInput, status: "pending" })
      .select("id")
      .single();
    if (error) {
      // uq_pga_pending 위반 = 같은 상품에 이미 진행 중인 시도가 있음(더블클릭 레이스)
      if (error.code === "23505") {
        return { ok: false, status: 409, error: "이미 생성 중입니다. 잠시 후 다시 시도해주세요." };
      }
      // 테이블 미생성 등 — 잠금 없이 통과(하위 호환)
      return { ok: true, attemptId: null, input: freshInput };
    }
    return { ok: true, attemptId: data.id, input: freshInput };
  } catch {
    return { ok: true, attemptId: null, input: freshInput };
  }
}

/** 생성 성공 시 호출. attemptId가 null이면(테이블 미생성 등) 아무 것도 하지 않는다. */
export async function finishAttemptDone(attemptId: string | null): Promise<void> {
  if (!attemptId) return;
  try {
    await supabaseAdmin
      .from("premium_generation_attempts")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", attemptId);
  } catch { /* noop */ }
}

/** 생성 실패 시 호출. input은 보존되어 같은 attemptId로 재생성할 수 있다. */
export async function finishAttemptFailed(attemptId: string | null, message: string): Promise<void> {
  if (!attemptId) return;
  try {
    await supabaseAdmin
      .from("premium_generation_attempts")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", attemptId);
  } catch { /* noop */ }
}

/** 이용권 부족 등 '생성 시도'로 볼 수 없는 조기 반환 시 시도 기록을 정리한다. */
export async function discardAttempt(attemptId: string | null): Promise<void> {
  if (!attemptId) return;
  try {
    await supabaseAdmin.from("premium_generation_attempts").delete().eq("id", attemptId);
  } catch { /* noop */ }
}
