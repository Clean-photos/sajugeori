import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { buildChart, petCompatibility } from "@/lib/saju-engine";
import type { PetSpecies } from "@/lib/saju-engine";
import { isoOf } from "@/lib/billing/report-target";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "반려동물 궁합 | 사주거리",
};

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 원인·동일 수정) — 반려동물 궁합 재열람.
 * premium_pet_reports는 프로필당 여러 행(아이별)이라 saju_profile_id가 아니라
 * 이 테이블 자체의 PK(id)로 식별한다. 소유자 본인인지만 확인하고 이용권은
 * 검사하지 않는다.
 */
export default async function SavedPetReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/pet/${id}`)}`);
  }
  const userId = session.user.id;

  const { data: row } = await supabaseAdmin
    .from("premium_pet_reports")
    .select("content, species, pet_name, pet_year, pet_month, pet_day, saju_profile_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row?.content) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/pet" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  // zodiac·element는 저장돼 있지 않다(리포트 본문만 캐시) — 집사 사주로 결정적
  // 재계산한다(LLM 재호출 없음). 집사 프로필도 본인 소유인지 함께 확인한다.
  const { data: profile } = await supabaseAdmin
    .from("saju_profiles")
    .select("birth_date, birth_time, gender")
    .eq("id", row.saju_profile_id)
    .eq("user_id", userId)
    .maybeSingle();

  const species = (row.species === "cat" ? "cat" : "dog") as PetSpecies;
  let petLabel = `${row.pet_name} · ${species === "cat" ? "고양이" : "강아지"}`;
  if (profile) {
    try {
      const owner = buildChart(
        isoOf({ birthDate: profile.birth_date, birthTime: profile.birth_time, gender: profile.gender as "M" | "F", calendar: "solar" }),
        profile.gender as "M" | "F",
        !!profile.birth_time
      );
      const facts = petCompatibility(owner, {
        species, petYear: row.pet_year, petMonth: row.pet_month, petDay: row.pet_day || null, petName: row.pet_name,
      });
      petLabel = `${row.pet_name} · ${facts.pet.zodiac}띠 · ${facts.pet.element}(${species === "cat" ? "고양이" : "강아지"})`;
    } catch { /* 라벨만 단순 폴백 — 본문 열람에는 영향 없음 */ }
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col pb-24">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/mypage" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          마이페이지
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">반려동물 궁합</h1>
      </div>

      <SavedReportClient content={row.content} species={species} petLabel={petLabel} petName={row.pet_name} reportId={id} />

      <BottomTabBar hasProfile />
    </div>
  );
}
