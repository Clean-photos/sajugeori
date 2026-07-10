import type { NextConfig } from "next";

// 환장의 케미(/chemi/*)는 별도 Vercel 프로젝트(hwanjang-chemi)로 배포된다.
// Next.js Multi-Zone 패턴: 여기서 /chemi/* 요청을 그 프로젝트로 프록시한다.
// hwanjang-chemi는 이미 basePath: '/chemi'로 빌드되어 있어 destination에도 /chemi를 유지해야 한다.
const CHEMI_ORIGIN = process.env.CHEMI_ORIGIN || "https://hwanjang-chemi.vercel.app";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  async rewrites() {
    return [
      {
        source: "/chemi",
        destination: `${CHEMI_ORIGIN}/chemi`,
      },
      {
        source: "/chemi/:path*",
        destination: `${CHEMI_ORIGIN}/chemi/:path*`,
      },
    ];
  },
};

export default nextConfig;
