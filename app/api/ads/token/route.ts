import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";
import { consume, clientIp, LIMITS } from "@/lib/security/rate-limit";

// POST /api/ads/token
// 광고 시청 플로우 시작 시 1회용 토큰 발급. 무료 리포트 API가 이 토큰을 소비(재사용 차단).
//
// 2026-10-04 보안 점검: 이 토큰은 "광고를 봤다"는 증명이 아니다(리포트 생성이 광고와 병렬로
// 시작되는 설계). 따라서 무료 AI 호출 남용은 발급 횟수 제한(IP당 10분/하루)과
// /api/free/* 쪽의 하루 전체 상한으로 막는다.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await consume("ad_token_ip", ip, ...LIMITS.adToken))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = randomBytes(24).toString("hex");

  try {
    const { error } = await supabaseAdmin.from("ad_tokens").insert({ token, user_key: ip, used: false });
    if (error) console.error("ad_tokens insert 실패:", error);
  } catch (e) {
    console.error("ad_tokens insert 예외:", e);
  }

  return NextResponse.json({ token });
}
