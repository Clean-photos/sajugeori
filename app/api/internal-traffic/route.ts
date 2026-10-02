import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/internal-traffic — 지금 로그인한 계정이 QA·CEO 내부 계정인가(GA4 traffic_type 표시용).
 *
 * 9차 G-1(CoS+CEO 확정, 2026-10-02): IP 규칙은 쓸 수 없어(여러 IP) 계정 기준으로 자동 표시한다.
 * 대상 계정은 환경변수 INTERNAL_TRAFFIC_EMAILS(쉼표 구분 이메일)로 설정한다 — 코드에 박지 않는다.
 * 값이 없으면 아무도 내부 계정이 아니다. 응답에는 boolean 하나만 담는다(대상 목록을 노출하지 않음).
 */
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase() ?? null;
  const allow = (process.env.INTERNAL_TRAFFIC_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return NextResponse.json({ internal: !!email && allow.includes(email) }, { headers: { "Cache-Control": "no-store" } });
}
