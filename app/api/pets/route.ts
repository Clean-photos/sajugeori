import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * GET /api/pets — 이 계정이 전에 등록한 반려동물 목록(PetForm의 "이전에
 * 등록한 아이" 칩용).
 *
 * [다중 사주 — 우선순위 확정, 2026-10-01] 펫은 saju_profiles로 통합하지
 * 않는다 — 대운을 쓰지 않아(lib/saju-engine/pet.ts에 gender 참조가 아예
 * 없음) saju_profiles.gender NOT NULL과 억지로 맞출 이유가 없고, reports가
 * 이미 (profile_id, product_id, variant) 유니크 제약으로 펫마다 고유하게
 * 식별되고 있어 그대로 재사용한다.
 *
 * [리포트 7개 테이블 통합, 2026-10-02] premium_pet_reports → reports(product_id
 * = 'pet_one')로 전환. species/pet_name/pet_year/month/day는 extra에 있다.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("extra, created_at")
    .eq("user_id", session.user.id).eq("product_id", "pet_one")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("GET /api/pets 실패:", error);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  const seen = new Set<string>();
  const pets = [];
  for (const row of data ?? []) {
    const extra = (row.extra ?? {}) as { species?: string; pet_name?: string; pet_year?: number; pet_month?: number; pet_day?: number | null };
    const key = `${extra.species}|${extra.pet_name}|${extra.pet_year}|${extra.pet_month}|${extra.pet_day ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pets.push({ species: extra.species, pet_name: extra.pet_name, pet_year: extra.pet_year, pet_month: extra.pet_month, pet_day: extra.pet_day ?? null });
  }

  return NextResponse.json({ pets });
}
