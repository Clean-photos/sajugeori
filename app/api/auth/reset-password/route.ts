import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const Schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요" }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const { data: rt } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("token, user_id, expires_at, used")
    .eq("token", token)
    .single();

  if (!rt || rt.used || new Date(rt.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "링크가 만료되었거나 이미 사용됐어요. 다시 요청해주세요." }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("users")
    .update({ password_hash: hashPassword(password) })
    .eq("id", rt.user_id);

  if (updateErr) {
    console.error("reset-password update error:", updateErr);
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다." }, { status: 500 });
  }

  await supabaseAdmin.from("password_reset_tokens").update({ used: true }).eq("token", token);

  return NextResponse.json({ ok: true });
}
