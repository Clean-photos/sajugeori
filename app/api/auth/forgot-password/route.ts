import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/resend";

const Schema = z.object({ email: z.string().email() });

const RESET_TTL_MS = 30 * 60 * 1000; // 30분

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "유효한 이메일을 입력하세요." }, { status: 400 });
  }
  const { email } = parsed.data;

  // 사용자 존재 여부와 무관하게 항상 같은 응답을 반환 (이메일 존재 여부 노출 방지)
  const GENERIC_OK = NextResponse.json({
    ok: true,
    message: "가입된 이메일이라면 재설정 링크를 보내드렸어요.",
  });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email, oauth_provider")
    .eq("email", email)
    .single();

  if (!user) return GENERIC_OK;

  const origin = req.nextUrl.origin;

  if (user.oauth_provider !== "email") {
    // 소셜 로그인 계정 — 비밀번호가 없으므로 안내 메일만 발송
    const providerLabel = user.oauth_provider === "google" ? "Google" : user.oauth_provider === "kakao" ? "카카오" : user.oauth_provider;
    await sendEmail({
      to: email,
      subject: "[사주거리] 비밀번호 재설정 안내",
      html: `<p>이 이메일은 ${providerLabel} 소셜 로그인으로 가입되어 있어 비밀번호가 없습니다.</p><p><a href="${origin}/login">${providerLabel} 로그인으로 계속하기</a></p>`,
    }).catch(() => {});
    return GENERIC_OK;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("password_reset_tokens")
    .insert({ token, user_id: user.id, expires_at: expiresAt });

  if (error) {
    console.error("forgot-password insert error:", error);
    return GENERIC_OK; // 내부 오류도 사용자에겐 동일 응답
  }

  const resetUrl = `${origin}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "[사주거리] 비밀번호 재설정",
    html: `
      <p>안녕하세요, 사주거리입니다.</p>
      <p>아래 링크를 눌러 비밀번호를 재설정하세요. (30분 이내 유효)</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
    `,
  }).catch((e) => console.error("reset email send error:", e));

  return GENERIC_OK;
}
