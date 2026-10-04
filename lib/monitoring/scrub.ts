/**
 * 에러 모니터링(Sentry) 개인정보 제거 필터 (2026-10-04).
 *
 * 이 서비스는 생년월일·태어난 시각·이메일을 다룬다. 에러 보고에 그 값이 실려 외부로 나가지 않도록
 * 전송 직전에 요청 본문·쿠키·헤더·쿼리스트링·사용자 이메일/IP를 지운다.
 * (Sentry 프로젝트 설정의 "Prevent Storing of IP Addresses"도 함께 켜 두는 것을 권장한다.)
 */
type Json = Record<string, unknown>;

interface ScrubbableEvent {
  request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: Json; data?: unknown } & Json;
  user?: Json;
  breadcrumbs?: { data?: Json; message?: string; category?: string }[];
  extra?: Json;
  contexts?: Json;
}

const KEEP_HEADERS = new Set(["user-agent", "accept-language", "content-type"]);

export function stripQuery(url: unknown): unknown {
  if (typeof url !== "string") return url;
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

export function scrubEvent<T>(input: T): T {
  // Sentry의 이벤트 타입은 SDK 버전마다 달라, 필요한 필드만 느슨하게 다룬다.
  const event = input as unknown as ScrubbableEvent;
  if (event.request) {
    const r = event.request;
    delete r.data;
    delete r.cookies;
    delete r.query_string;
    r.url = stripQuery(r.url) as string | undefined;
    if (r.headers) {
      r.headers = Object.fromEntries(Object.entries(r.headers).filter(([k]) => KEEP_HEADERS.has(k.toLowerCase())));
    }
  }
  if (event.user) {
    // 식별은 내부 id만 남긴다.
    event.user = event.user.id ? { id: event.user.id } : {};
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      if (b.data) {
        const data = { ...b.data };
        for (const k of ["url", "from", "to"]) if (k in data) data[k] = stripQuery(data[k]);
        delete data.body;
        delete data.request_body_size;
        b = { ...b, data };
      }
      return b;
    });
  }
  return input;
}

/** 서버·엣지·브라우저 공통 초기화 옵션. DSN이 없으면 비활성(로컬·미설정 환경에서 아무 일도 안 한다). */
export function sentryBaseOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: !!dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
    // 에러만 수집한다 — 성능 추적·세션 리플레이는 쓰지 않는다(무료 한도 보호, 사용자 입력 화면 녹화 방지).
    tracesSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      "AbortError",
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
    ],
    beforeSend: scrubEvent,
  };
}
