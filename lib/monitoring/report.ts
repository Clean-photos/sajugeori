import * as Sentry from "@sentry/nextjs";

/**
 * 핵심 실패 지점에서 쓰는 에러 보고 헬퍼 (2026-10-04).
 * console.error는 그대로 남기고(Vercel 로그), DSN이 설정돼 있으면 Sentry로도 보낸다.
 * context에는 개인정보(생년월일·이메일 등)를 넣지 않는다 — 주문번호·상품 id·단계 이름 정도만.
 */
export function reportError(
  error: unknown,
  where: string,
  context?: Record<string, string | number | boolean | null>,
  options: { log?: boolean } = {}
): void {
  if (options.log !== false) console.error(`[${where}]`, error);
  try {
    Sentry.withScope((scope) => {
      scope.setTag("where", where);
      if (context) scope.setContext("detail", context);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } catch {
    /* 모니터링 실패가 본 기능을 막아서는 안 된다 */
  }
}
