import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";

// POST /api/ads/token
// 광고 시청 플로우 시작 시 1회용 토큰 발급. 무료 리포트 API가 이 토큰을 소비(재사용 차단).
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const token = randomBytes(24).toString("hex");

  try {
    await supabaseAdmin.from("ad_tokens").insert({ token, user_key: ip, used: false });
  } catch {
    // 테이블/DB 이슈 시에도 토큰은 반환 — 검증 단계에서 처리
  }

  return NextResponse.json({ token });
}
