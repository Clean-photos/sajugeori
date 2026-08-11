import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

// DELETE /api/account — 회원 탈퇴. public.users 행을 지우면 saju_profiles·
// premium_reports 등 거의 모든 개인 데이터가 ON DELETE CASCADE로 함께 지워진다
// (schema.sql·lib/db/migrations 참고). 다만 one_time_purchases(결제 기록)는
// auth.users를 참조하고 있어 이 cascade에 걸리지 않는다 — 전자상거래법상
// 결제 기록은 보관 의무가 있어 의도적으로 남겨둔다. premium_generation_attempts는
// 순수 운영용 임시 데이터라 함께 정리한다.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  await supabaseAdmin.from("premium_generation_attempts").delete().eq("user_id", userId);

  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (error) {
    console.error("account deletion error:", error);
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  await signOut({ redirect: false });

  return NextResponse.json({ ok: true });
}
