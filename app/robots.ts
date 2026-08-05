import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 로그인·가입·개인 영역은 본문이 없는 화면이라 평가 대상에서 뺀다.
      // sitemap에도 없지만 링크를 타고 크롤될 수 있어 명시적으로 막는다.
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/mypage", "/onboarding", "/login", "/signup", "/reset-password", "/forgot-password"],
      },
      // AdSense 심사 대비: /chemi(인터랙티브 도구, 텍스트 얇음)를 심사·크롤 대상에서 제외.
      // 승인 후 /chemi에 AdSense를 붙이려면 Mediapartners-Google 차단을 해제해야 함.
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/mypage", "/onboarding", "/login", "/signup", "/reset-password", "/forgot-password", "/chemi"],
      },
      {
        userAgent: "Mediapartners-Google",
        disallow: ["/chemi"],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
