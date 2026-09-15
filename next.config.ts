import type { NextConfig } from "next";

// 환장의 케미(/chemi/*)는 별도 Vercel 프로젝트(hwanjang-chemi)로 배포된다.
// Next.js Multi-Zone 패턴: 여기서 /chemi/* 요청을 그 프로젝트로 프록시한다.
// hwanjang-chemi는 이미 basePath: '/chemi'로 빌드되어 있어 destination에도 /chemi를 유지해야 한다.
const CHEMI_ORIGIN = process.env.CHEMI_ORIGIN || "https://hwanjang-chemi.vercel.app";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // §5-1(CoS 요청, 2026-09-15): /api/version이 배포를 식별할 방법이 없어
  // CoS가 구버전 화면을 새 배포로 오판(§2-1 오탐)한 적이 있었다. 빌드 시각을
  // 여기서 한 번 고정해 process.env로 주입 — 서버리스 함수의 콜드스타트
  // 시각이 아니라 실제 `next build` 시각이 나가야 배포 단위와 정확히 맞는다.
  env: { BUILD_TIME: new Date().toISOString() },
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
