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
 * 도메인 메일(support@·privacy@)은 현재 수신 설정이 되어 있지 않아 반송된다.
 * 죽은 주소를 약관·개인정보처리방침에 적어 두면 연락이 닿지 않을 뿐 아니라,
 * 심사에서 확인했을 때 신뢰를 잃는다. 그래서 지금은 문의 폼(/contact)을
 * 주 연락 수단으로 안내한다. 폼 내용은 서버에 저장되므로 실제로 전달된다.
 *
 * 도메인 메일 포워딩을 설정한 뒤에는 아래 CONTACT_EMAIL만 채우면
 * 약관·개인정보처리방침에 이메일이 함께 노출된다.
 */
export const CONTACT_EMAIL: string | null =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null;

/** 문의 폼 경로 — 메일이 없을 때의 기본 연락 수단 */
export const CONTACT_PATH = "/contact";
