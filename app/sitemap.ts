import type { MetadataRoute } from "next";
import { ARTICLES } from "./guide/articles";
import { TERMS } from "./dictionary/terms";

import { SITE_URL as BASE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/guide`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/dictionary`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    // 엔진으로 산출한 조견표. 해가 바뀌면 내용이 갱신되므로 yearly로 둔다.
    { url: `${BASE_URL}/reference/samjae`, changeFrequency: "yearly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/reference/ganji`, changeFrequency: "yearly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/free/saju`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/free/compatibility`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/free/taekil`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/free/yearly`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/premium/menu`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
    // /premium/salpuri, /premium/pet은 sitemap에서 뺀다.
    // 로그인·구독 게이트 뒤라 크롤러에게는 소개문 + "로그인이 필요해요" 화면만 보인다.
    // 색인 대상으로 제출하면 얇은 페이지를 스스로 신고하는 셈이라 역효과.
    // 두 기능의 설명은 /premium/menu 본문에 담겨 있어 정보 손실은 없다.
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3, lastModified: now },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3, lastModified: now },
  ];

  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${BASE_URL}/guide/${a.slug}`,
    changeFrequency: "yearly",
    priority: 0.6,
    lastModified: now,
  }));

  const termPages: MetadataRoute.Sitemap = TERMS.map((t) => ({
    url: `${BASE_URL}/dictionary/${t.slug}`,
    changeFrequency: "yearly",
    priority: 0.6,
    lastModified: now,
  }));

  return [...staticPages, ...articlePages, ...termPages];
}
