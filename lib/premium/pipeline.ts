import { NextResponse } from "next/server";
import { checkReportAccess, refundOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";

/**
 * 프리미엄 리포트 라우트 공통 생성 파이프라인 (2026-10-04 리팩터).
 *
 * 7개 상품 라우트가 "시도 시작 → 이용권 선점 → 생성 → 소진/환불" 흐름을 각자 복사해 두고 있었고,
 * 그 사이에 순서가 갈려 있었다(살풀이: 이용권을 먼저 선점한 뒤 시도 잠금을 걸어, 더블클릭으로 409가 나면
 * 선점한 이용권이 환불 없이 사라졌다). 이 모듈이 흐름과 실패 시 정리를 한 곳에서 책임진다.
 *
 * 표준 순서(캐시 확인은 라우트가 이 앞에서 한다 — 이미 만든 리포트는 이용권 없이도 다시 열린다):
 *   beginAttempt  → 같은 상품 동시 생성 차단(pending 잠금)
 *   acquirePass   → 구독자가 아니면 단건 이용권을 원자적으로 선점. 없으면 시도 기록 삭제 후 402
 *   runGeneration → 생성(+저장). 성공 시 시도 완료, 예외 시 이용권 환불 + 시도 실패 기록
 */
export interface PipelineDeps {
  startAttempt: typeof startAttempt;
  discardAttempt: typeof discardAttempt;
  finishAttemptDone: typeof finishAttemptDone;
  finishAttemptFailed: typeof finishAttemptFailed;
  checkReportAccess: typeof checkReportAccess;
  refundOneTimePass: typeof refundOneTimePass;
}

export const realDeps: PipelineDeps = {
  startAttempt, discardAttempt, finishAttemptDone, finishAttemptFailed, checkReportAccess, refundOneTimePass,
};

export interface AttemptCtx {
  attemptId: string | null;
  /** attemptId로 재생성을 요청한 경우 최초 시도 때 저장해 둔 입력, 아니면 이번 요청의 입력 */
  input: Record<string, unknown>;
}

export async function beginAttempt(
  userId: string,
  productId: string,
  attemptId: string | undefined,
  freshInput: Record<string, unknown>,
  deps: PipelineDeps = realDeps
): Promise<{ ok: true; attempt: AttemptCtx } | { ok: false; response: NextResponse }> {
  const started = await deps.startAttempt(userId, productId, attemptId, freshInput);
  if (!started.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: started.error, busy: started.busy ?? false }, { status: started.status }),
    };
  }
  return { ok: true, attempt: { attemptId: started.attemptId, input: started.input } };
}

/** 생성 시도로 볼 수 없는 조기 반환(입력 오류·캐시 적중·이용권 부족): 시도 기록을 지우고 응답을 그대로 돌려준다. */
export async function abortAttempt(
  attempt: AttemptCtx,
  response: NextResponse,
  deps: PipelineDeps = realDeps
): Promise<NextResponse> {
  await deps.discardAttempt(attempt.attemptId);
  return response;
}

export async function acquirePass(
  userId: string,
  productId: string,
  attempt: AttemptCtx,
  deps: PipelineDeps = realDeps
): Promise<{ ok: true; passId: string | null } | { ok: false; response: NextResponse }> {
  const access = await deps.checkReportAccess(userId, productId);
  if (!access.allowed) {
    await deps.discardAttempt(attempt.attemptId);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "premium_required", redirect: `/premium/buy?product=${productId}` },
        { status: 402 }
      ),
    };
  }
  return { ok: true, passId: access.passId };
}

/** 실제 생성 시도가 실패한 경우(엔진 오류 등): 이용권을 돌려주고 실패 사유를 남긴다. */
export async function failAttempt(
  attempt: AttemptCtx,
  passId: string | null,
  reason: string,
  response: NextResponse,
  deps: PipelineDeps = realDeps
): Promise<NextResponse> {
  if (passId) await deps.refundOneTimePass(passId);
  await deps.finishAttemptFailed(attempt.attemptId, reason);
  return response;
}

const DEFAULT_FAILURE = "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.";

/**
 * 생성(+저장)을 실행한다. run이 끝까지 성공하면 시도를 완료로 표시하고 ok(결과)를 응답으로 돌려주며,
 * 예외가 나면 이용권을 환불하고 시도를 실패로 남긴 뒤 500을 돌려준다(attemptId 포함 → 같은 정보로 재생성 가능).
 */
export async function runGeneration<T>(
  opts: {
    label: string;
    attempt: AttemptCtx;
    passId: string | null;
    run: () => Promise<T>;
    ok: (value: T) => NextResponse;
    failureMessage?: string;
    includeAttemptIdOnFailure?: boolean;
    failureStatus?: number;
  },
  deps: PipelineDeps = realDeps
): Promise<NextResponse> {
  let value: T;
  try {
    value = await opts.run();
  } catch (e) {
    console.error(`premium ${opts.label} LLM error:`, e);
    const body: Record<string, unknown> = { error: opts.failureMessage ?? DEFAULT_FAILURE };
    if (opts.includeAttemptIdOnFailure !== false) body.attemptId = opts.attempt.attemptId;
    return failAttempt(
      opts.attempt, opts.passId, "LLM 호출 오류",
      NextResponse.json(body, { status: opts.failureStatus ?? 500 }), deps
    );
  }
  await deps.finishAttemptDone(opts.attempt.attemptId);
  return opts.ok(value);
}
