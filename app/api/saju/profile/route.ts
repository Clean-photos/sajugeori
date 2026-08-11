import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

// DELETE /api/saju/profile — 등록된 내 사주 정보를 삭제한다. saju_profiles 행이
// 지워지면 그 프로필에 연결된 모든 프리미엄 리포트(사주·궁합·살풀이·택일·연운세·
// 펫·운명설계도)도 ON DELETE CASCADE로 함께 사라진다 — 다시 보려면 사주를
// 재등록하고 해당하는 만큼 다시 결제해야 한다.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { error } = await supabaseAdmin
    .from("saju_profiles").delete()
    .eq("user_id", userId).eq("label", "본인");

  if (error) {
    console.error("saju profile deletion error:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
