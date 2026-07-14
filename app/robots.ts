import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mypage", "/onboarding"],
    },
    host: "https://sajugeori.com",
    sitemap: "https://sajugeori.com/sitemap.xml",
  };
}
