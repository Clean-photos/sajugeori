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
