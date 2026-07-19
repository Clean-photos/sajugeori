import { ARTICLES } from "@/app/guide/articles";
import { TERMS, CATEGORY_LABEL } from "@/app/dictionary/terms";

import { SITE_URL as BASE_URL } from "@/lib/site";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * RSS 2.0 피드. 크롤러에 신규 콘텐츠 발견 경로를 하나 더 열어 준다.
 * 읽을거리 + 용어 백과를 모두 싣는다(정적 콘텐츠라 pubDate는 빌드 시각 기준).
 */
export function GET() {
  const now = new Date().toUTCString();

  const articleItems = ARTICLES.map(
    (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${BASE_URL}/guide/${a.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/guide/${a.slug}</guid>
      <description>${esc(a.summary)}</description>
      <category>사주 읽을거리</category>
      <pubDate>${now}</pubDate>
    </item>`
  );

  const termItems = TERMS.map(
    (t) => `    <item>
      <title>${esc(t.hanja ? `${t.term}(${t.hanja})` : t.term)} — 사주 용어 백과</title>
      <link>${BASE_URL}/dictionary/${t.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/dictionary/${t.slug}</guid>
      <description>${esc(t.summary)}</description>
      <category>${esc(CATEGORY_LABEL[t.category])}</category>
      <pubDate>${now}</pubDate>
    </item>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>사주거리</title>
    <link>${BASE_URL}</link>
    <description>사주와 명리학의 개념을 쉽게 풀어 쓴 읽을거리와 용어 백과</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${[...articleItems, ...termItems].join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
