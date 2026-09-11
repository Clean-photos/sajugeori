import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { buildChart } from "@/lib/saju-engine/engine";
import { buildCompatPillarSummary, type CompatPillarSummary } from "@/lib/premium/compat-pillars";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "프리미엄 궁합 | 사주거리",
};

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 원인·동일 수정) — 궁합 재열람.
 * premium_compatibility_reports는 프로필당 여러 행(상대·관계유형 조합별)이라
 * 이 테이블 자체의 PK(id)로 식별한다. 소유자 본인인지만 확인하고 이용권은
 * 검사하지 않는다.
 *
 * §7-3(CoS 실물 재검증, 2026-09-10): 두 사람의 명식표를 열람 시 다시 계산한다
 * (저장 안 함 — §0-2①/②와 같은 이유, chart만 있으면 재계산 비용이 0). A의
 * 태어난 시각은 이 테이블에 없고 saju_profiles에만 있어 별도로 읽는다.
 * partner_birth_time 컬럼은 마이그레이션 020 적용 전이면 아직 없을 수 있어
 * select 자체가 실패할 수 있다 — 실패하면 명식표 없이 본문만 보여준다
 * (페이지 전체를 깨뜨리지 않는다).
 */
export default async function SavedCompatReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/compatibility/${id}`)}`);
  }
  const userId = session.user.id;

  // ⚠️ partner_birth_time(마이그레이션 020)은 컬럼이 아직 없을 수 있다 — 그
  // 경우 select 자체가 통째로 실패해 리포트 본문까지 못 읽게 되면 안 되므로,
  // 필수 컬럼과 분리해 별도로(실패 허용) 조회한다.
  const { data: row } = await supabaseAdmin
    .from("premium_compatibility_reports")
    .select("content, score, saju_profile_id, person_a_birth, person_a_gender, partner_birth, partner_gender, context")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row?.content) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/compatibility" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  let pillars: { a: CompatPillarSummary; b: CompatPillarSummary } | null = null;
  try {
    let aBirthTime: string | null = null;
    if (row.saju_profile_id) {
      const { data: profile } = await supabaseAdmin
        .from("saju_profiles").select("birth_time").eq("id", row.saju_profile_id).maybeSingle();
      aBirthTime = profile?.birth_time ?? null;
    }
    // partner_birth_time은 컬럼 자체가 없을 수 있어(마이그레이션 020 미적용)
    // 실패를 허용하는 별도 조회로 분리한다 — 실패하면 "시각 모름"으로 취급.
    let partnerBirthTime: string | null = null;
    try {
      const { data: t } = await supabaseAdmin
        .from("premium_compatibility_reports").select("partner_birth_time").eq("id", id).maybeSingle();
      partnerBirthTime = (t as { partner_birth_time?: string } | null)?.partner_birth_time || null;
    } catch { /* 컬럼 없음 — 시각 모름으로 취급 */ }

    const tOf = (t: string | null) => (t ? (t.length === 5 ? `${t}:00` : t) : "00:00:00");
    const meChart = buildChart(`${row.person_a_birth}T${tOf(aBirthTime)}`, row.person_a_gender, !!aBirthTime);
    const otherChart = buildChart(`${row.partner_birth}T${tOf(partnerBirthTime)}`, row.partner_gender, !!partnerBirthTime);
    pillars = { a: buildCompatPillarSummary(meChart, "나"), b: buildCompatPillarSummary(otherChart, "상대") };
  } catch (e) {
    console.error("궁합 저장본 명식표 재계산 실패, 표 없이 렌더:", e);
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">프리미엄 궁합</h1>
      </div>

      <SavedReportClient content={row.content} score={row.score ?? null} reportId={id} pillars={pillars} />

      <BottomTabBar hasProfile />
    </div>
  );
}
