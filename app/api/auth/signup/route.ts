import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const SignupSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
  nickname: z.string().min(1, "별명을 입력하세요").max(20, "별명은 20자 이하여야 합니다"),
  agreed: z.literal(true, { errorMap: () => ({ message: "약관에 동의해야 합니다" }) }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "입력값을 확인해주세요";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { email, password, nickname } = parsed.data;

  // 중복 이메일 확인
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  // 유저 생성
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert({
      oauth_provider: "email",
      oauth_sub: email,
      email,
      display_name: nickname,
      password_hash: hashPassword(password),
    })
    .select("id, email, display_name")
    .single();

  if (error || !user) {
    console.error("signup error:", error);
    return NextResponse.json({ error: "가입 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: user.email, nickname: user.display_name });
}
