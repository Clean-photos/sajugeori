import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * GET /api/profiles — 이 계정이 등록해 둔 사주 목록(사람·펫 통합).
 *
 * [다중 사주 — 우선순위 확정, 2026-10-01] 7개 범위 3). 마이그레이션 021로
 * saju_profiles에 kind·is_primary·species가 생긴 뒤, "누구 사주로 볼까" 같은
 * 선택 UI가 바로 쓸 수 있는 목록 형태로 노출한다. 아직 어떤 화면도 이 API를
 * 호출하지 않는다 — ProfilePicker UI가 붙기 전까지는 완전히 비활성 코드라
 * 배포해도 기존 동작에 영향이 없다.
 *
 * label="대상"(report-target.ts의 1회성 대상 프로필)은 여기서 제외한다 —
 * 그건 "등록"이 아니라 상품 생성 과정에서 생긴 캐시용 부산물이라, 사람이
 * 직접 관리하는 목록에 섞이면 안 된다.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("saju_profiles")
    .select("id, label, kind, species, is_primary, birth_date, birth_time, gender, calendar, created_at")
    .eq("user_id", session.user.id)
    .neq("label", "대상")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET /api/profiles 실패:", error);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}
