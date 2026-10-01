import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * GET /api/profiles — 이 계정이 등록해 둔 사주 목록(사람·펫 통합).
 *
 * [다중 사주 — 우선순위 확정, 2026-10-01] 7개 범위 3). 마이그레이션 021로
 * saju_profiles에 kind·is_primary·species가 생긴 뒤, "누구 사주로 볼까" 같은
 * 선택 UI가 바로 쓸 수 있는 목록 형태로 노출한다.
 *
 * label="대상"(report-target.ts의 1회성 대상 프로필, 상품 폼에 가족 사주를
 * 직접 입력했을 때 생기는 row)도 포함한다 — 처음엔 "캐시 부산물이라 제외"로
 * 뺐었는데, 실제로 "다른 분 사주 다시 선택"에 쓸 데이터는 거의 전부 이
 * 경로로 생긴다(온보딩은 "본인" 하나만 다룸). 뺐으면 가장 필요한 목록이
 * 거의 항상 비어 있었을 것 — ProfilePicker가 is_primary만 보고 필터링한다.
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
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/profiles 실패:", error);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}
