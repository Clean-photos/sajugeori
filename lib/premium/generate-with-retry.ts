"use client";

/**
 * 프리미엄 생성 요청 공용 재시도 래퍼.
 *
 * 2026-09-16: 같은 계정에서 두 창(탭)이 동시에 같은 상품을 생성 요청하면,
 * 서버(lib/billing/attempts.ts의 startAttempt)는 이미 뒤 요청을 409로 막아
 * 중복 LLM 호출은 막고 있었다 — 그런데 클라이언트가 그 409를 그냥 하드
 * 에러로 보여주고 끝나, 사용자가 수동으로 다시 눌러야 했다("네트워크 연결을
 * 확인한 뒤 다시 시도해주세요"로 보였던 사고와 같은 계열, CoS 2026-09-15
 * 재검증). 서버가 `busy:true`로 표시해 주는 경우만 짧게 기다렸다 자동으로
 * 다시 보내 — 앞 요청(A)이 끝나면 뒤 요청(B)이 그 결과(캐시 적중)를 이어받게
 * 한다. 새 LLM 호출을 만들어내지 않는다 — 매 재시도도 startAttempt를 다시
 * 타므로, A가 아직 진행 중이면 여전히 busy로 막히고 재시도만 반복된다.
 */
export type GenerateRetryResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: unknown; status: number };

const RETRY_INTERVAL_MS = 4000;

async function requestWithBusyRetry<T>(
  doFetch: () => Promise<Response>,
  opts?: { maxWaitMs?: number; onRetry?: (attempt: number) => void }
): Promise<GenerateRetryResult<T>> {
  const maxWaitMs = opts?.maxWaitMs ?? 90_000;
  const start = Date.now();
  let attempt = 0;

  for (;;) {
    let res: Response;
    try {
      res = await doFetch();
    } catch {
      return { ok: false, data: null, status: 0 };
    }

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // 본문이 없거나 JSON이 아님 — 아래에서 res.ok로만 판단.
    }

    if (res.ok) return { ok: true, data: data as T };

    const busy = res.status === 409 && (data as { busy?: boolean } | null)?.busy === true;
    if (busy && Date.now() - start + RETRY_INTERVAL_MS < maxWaitMs) {
      attempt += 1;
      opts?.onRetry?.(attempt);
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      continue;
    }
    return { ok: false, data, status: res.status };
  }
}

export function postWithBusyRetry<T = unknown>(
  url: string,
  body: unknown,
  opts?: { maxWaitMs?: number; onRetry?: (attempt: number) => void }
): Promise<GenerateRetryResult<T>> {
  return requestWithBusyRetry<T>(
    () => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    opts
  );
}

export function getWithBusyRetry<T = unknown>(
  url: string,
  opts?: { maxWaitMs?: number; onRetry?: (attempt: number) => void }
): Promise<GenerateRetryResult<T>> {
  return requestWithBusyRetry<T>(() => fetch(url), opts);
}
