import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * GET /api/pets — 이 계정이 전에 등록한 반려동물 목록(PetForm의 "이전에
 * 등록한 아이" 칩용).
 *
 * [다중 사주 — 우선순위 확정, 2026-10-01] 펫은 saju_profiles로 통합하지
 * 않는다 — 대운을 쓰지 않아(lib/saju-engine/pet.ts에 gender 참조가 아예
 * 없음) saju_profiles.gender NOT NULL과 억지로 맞출 이유가 없고,
 * premium_pet_reports가 이미 (saju_profile_id, species, pet_name, pet_year,
 * pet_month, pet_day) 유니크 제약으로 펫마다 고유하게 식별되고 있어 그대로
 * 재사용한다.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("premium_pet_reports")
    .select("species, pet_name, pet_year, pet_month, pet_day, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("GET /api/pets 실패:", error);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  const seen = new Set<string>();
  const pets = [];
  for (const row of data ?? []) {
    const key = `${row.species}|${row.pet_name}|${row.pet_year}|${row.pet_month}|${row.pet_day ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pets.push(row);
  }

  return NextResponse.json({ pets });
}
