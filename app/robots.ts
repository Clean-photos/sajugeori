import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/mypage", "/onboarding"],
      },
      // AdSense 심사 대비: /chemi(인터랙티브 도구, 텍스트 얇음)를 심사·크롤 대상에서 제외.
      // 승인 후 /chemi에 AdSense를 붙이려면 Mediapartners-Google 차단을 해제해야 함.
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/mypage", "/onboarding", "/chemi"],
      },
      {
        userAgent: "Mediapartners-Google",
        disallow: ["/chemi"],
      },
    ],
    host: "https://sajugeori.com",
    sitemap: "https://sajugeori.com/sitemap.xml",
  };
}
