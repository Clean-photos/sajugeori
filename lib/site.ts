/**
 * 사이트 정본 URL 단일 출처.
 *
 * 현재 배포는 sajugeori.com → www.sajugeori.com 으로 308 리디렉션되므로
 * 정본(canonical)은 www 쪽이다. sitemap·robots·canonical·OG·RSS가 모두 이 값을
 * 써야 하며, 값이 실제 서빙 호스트와 어긋나면 제출한 URL이 전부 리디렉션으로
 * 처리되어 색인이 지연된다.
 *
 * Vercel에서 기본 도메인을 non-www로 바꾸는 경우
 * NEXT_PUBLIC_SITE_URL=https://sajugeori.com 을 설정하면 코드 수정 없이 따라간다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.sajugeori.com";

/**
 * 연락처 단일 출처.
 *
 * 도메인 메일은 포워딩으로 수신된다. 값이 비면 약관·개인정보처리방침에서
 * 이메일 줄을 렌더하지 않고 문의 폼만 안내하므로, 수신이 끊기면 이 값을
 * 비우는 것만으로 죽은 주소가 노출되는 상황을 막을 수 있다.
 */
export const CONTACT_EMAIL: string | null =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@sajugeori.com";

/** 문의 폼 경로 — 메일과 함께 안내하는 연락 수단 */
export const CONTACT_PATH = "/contact";

/**
 * 사업자 정보 — 전자상거래법에 따라 표시한다.
 *
 * 값을 채우면 약관과 푸터에 자동으로 함께 노출된다(빈 값은 렌더하지 않음).
 */
export const BUSINESS = {
  name: "류온스튜디오",
  registrationNo: "795-05-03721",
  address: "인천광역시 남동구 남동서로236번길 30, 222-A29호",
  ceo: "최재진",
  mailOrderNo: "제2026-인천남동구-1267호",
} as const;
