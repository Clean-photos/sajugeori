/**
 * 로그인·온보딩 후 이동 경로 검증 — 사이트 내부 경로만 허용한다(오픈 리다이렉트 방지, 2026-10-04 점검).
 * "//evil.com", "/\evil.com"(브라우저가 \를 /로 취급), "https://…", 제어문자 포함 값은 fallback으로 대체.
 */
export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!/^\/(?![/\\])/.test(value)) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
