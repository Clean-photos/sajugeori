import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

const Schema = z.object({ email: z.string().email("유효한 이메일을 입력하세요") });

// POST /api/launch-notify — 결제 오픈 알림 신청. 개인정보 최소 수집(이메일만).
// 로그인 상태면 user_id도 함께 남겨 오픈 시 계정으로 바로 쿠폰을 붙일 수 있게 한다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "이메일을 확인해주세요" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { error } = await supabaseAdmin
    .from("launch_notify_subscribers")
    .upsert({ email, user_id: userId }, { onConflict: "email" });

  if (error) {
    console.error("launch-notify upsert error:", error);
    return NextResponse.json({ error: "신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
