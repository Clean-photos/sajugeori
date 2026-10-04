import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "@/lib/monitoring/scrub";

// Next.js가 서버 시작 시 한 번 부른다. Node·Edge 런타임 모두 같은 옵션(개인정보 제거 포함)으로 초기화한다.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryBaseOptions());
  }
}

// 라우트·서버 컴포넌트에서 처리되지 않은 에러를 자동으로 보고한다.
export const onRequestError = Sentry.captureRequestError;
