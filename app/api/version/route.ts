import { NextResponse } from "next/server";

// §5-1(CoS 요청, 2026-09-15): 실물 검증마다 어느 배포를 보고 있는지 알 방법이
// 없어, 구버전 화면을 새 배포로 오판해 §2-1을 헛되이 미해결로 보고한 적이
// 있었다. commit·배포 환경·빌드 시각을 1회 호출로 확인할 수 있게 한다.
// Vercel이 빌드마다 주입하는 VERCEL_GIT_COMMIT_SHA를 그대로 쓰고, 로컬
// 실행(값 없음)에서는 "local"로 표시한다.
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: process.env.VERCEL_ENV ?? "development",
    builtAt: process.env.BUILD_TIME ?? null,
  });
}
