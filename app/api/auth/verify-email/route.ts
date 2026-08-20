import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET /api/auth/verify-email?token=... — 가입 시 발송된 인증 링크를 클릭하면 호출된다.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?verified=0`);
  }

  const { data: row } = await supabaseAdmin
    .from("email_verification_tokens")
    .select("user_id, expires_at, used")
    .eq("token", token)
    .single();

  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return NextResponse.redirect(`${origin}/login?verified=0`);
  }

  await supabaseAdmin.from("users").update({ email_verified_at: new Date().toISOString() }).eq("id", row.user_id);
  await supabaseAdmin.from("email_verification_tokens").update({ used: true }).eq("token", token);

  return NextResponse.redirect(`${origin}/login?verified=1`);
}
