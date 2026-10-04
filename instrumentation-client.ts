import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "@/lib/monitoring/scrub";

// 브라우저 초기화. 세션 리플레이는 쓰지 않는다(생년월일 입력 화면이 녹화되지 않게).
Sentry.init({
  ...sentryBaseOptions(),
  denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
