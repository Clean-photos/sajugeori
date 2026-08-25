import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 로그인·가입·개인 영역은 본문이 없는 화면이라 평가 대상에서 뺀다.
      // sitemap에도 없지만 링크를 타고 크롤될 수 있어 명시적으로 막는다.
      // (2026-07-17~2026-08-23: AdSense 심사 대비로 /chemi를 Googlebot·Mediapartners-Google에서
      //  별도 차단했었으나, 재심사 탈락 후 검색 유입을 막을 이유가 없어져 원복함)
      {
        userAgent: "*",
        allow: "/",
        // /chemi/r/*(방 결과 페이지)는 참가자 실명 닉네임이 노출되고 12시간 뒤 삭제되는
        // 휘발성 데이터라 색인되면 "12시간 후 소멸" 약속과 어긋난다. 색인 가치도 없다(2026-08-25).
        disallow: [
          "/api/",
          "/mypage",
          "/onboarding",
          "/login",
          "/signup",
          "/reset-password",
          "/forgot-password",
          "/chemi/r/",
        ],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
