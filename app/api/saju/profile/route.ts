import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * POST /api/saju/profile/confirm 대신 이 경로 하나로 처리한다(용도가 좁고
 * saju/profile과 묶어 두는 편이 자연스럽다) — 생년월일 확인 배너의
 * "확인했어요"가 부르는 엔드포인트.
 *
 * §1(양력·음력 선택) 도입 전에 저장된 값은 실제로는 음력인데 양력 칸에
 * 들어가 있을 수 있다(마이그레이션 019 참고). 데이터만으로는 잘못 입력된
 * 것과 실제 양력인 것을 구분할 수 없어 자동 교정이 불가능하므로, 본인이
 * "맞다"고 확인한 시각을 남겨 배너를 다시 띄우지 않는다. 매번 뜨면 이미
 * 정상 입력한 사용자에게는 그냥 소음이 된다.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { error } = await supabaseAdmin
    .from("saju_profiles")
    .update({ birth_date_confirmed_at: new Date().toISOString() })
    .eq("user_id", userId).eq("label", "본인");

  if (error) {
    console.error("birth_date_confirmed_at 갱신 실패:", error);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

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

  // label 조건 없이 이 사용자의 사주 행을 전부 지운다.
  // 예전에는 "본인" 행만 지워서, 가족·친구 사주로 리포트를 본 적이 있으면
  // 그 생년월일이 label="대상" 행으로 남았다 — 삭제 요청의 취지에 어긋난다.
  const { error } = await supabaseAdmin
    .from("saju_profiles").delete()
    .eq("user_id", userId);

  if (error) {
    console.error("saju profile deletion error:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
