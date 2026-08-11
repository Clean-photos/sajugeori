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
    { url: `${BASE_URL}/guide/start`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
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
    // 비로그인 방문자에게도 실제 생성된 리포트 샘플 전문을 보여 주므로(SamplePreview/
    // DestinySamplePreview), 더 이상 "얇은 게이트 페이지"가 아니다. 전부 색인 대상에 포함.
    { url: `${BASE_URL}/premium`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/compatibility`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/salpuri`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/taekil`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/yearly`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/pet`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/premium/destiny`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
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
