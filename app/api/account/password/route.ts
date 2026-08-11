import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const Schema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
});

// POST /api/account/password — 로그인 필수. 이메일 가입 계정만 대상(구글·카카오는
// 비밀번호 자체가 없다). 현재 비밀번호 확인 후에만 변경한다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const { data: user } = await supabaseAdmin
    .from("users").select("oauth_provider, password_hash")
    .eq("id", userId).single();

  if (!user || user.oauth_provider !== "email") {
    return NextResponse.json({ error: "이메일로 가입한 계정만 비밀번호를 변경할 수 있어요." }, { status: 403 });
  }

  if (hashPassword(currentPassword) !== user.password_hash) {
    return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("users").update({ password_hash: hashPassword(newPassword) })
    .eq("id", userId);

  if (error) {
    console.error("change password error:", error);
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
