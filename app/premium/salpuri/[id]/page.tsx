import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { buildChart } from "@/lib/saju-engine";
import { isoOf } from "@/lib/billing/report-target";
import type { DetectedSal } from "@/components/premium/SalpuriReportResultView";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "프리미엄 살풀이 | 사주거리",
};

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 원인·동일 수정): 살풀이도 캐시 테이블 PK가
 * saju_profile_id 1:1이라 오행과 완전히 같은 구조다. "보기 →"가 재생성을
 * 요청해 1회권 소진자를 결제 게이트로 되돌리는 문제를 id 기반 열람으로 없앤다
 * — 소유자 본인인지만 확인하고 이용권은 검사하지 않는다.
 */
export default async function SavedSalpuriReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/salpuri/${id}`)}`);
  }
  const userId = session.user.id;

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("premium_salpuri_reports")
      .select("content")
      .eq("saju_profile_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("saju_profiles")
      .select("birth_date, birth_time, gender")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!row?.content || !profile) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/salpuri" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  // premium_salpuri_reports는 리포트 본문(TEXT)만 저장하고, 태그 칩·하이라이트용
  // 신살 목록(sal)은 저장하지 않는다 — 생성 시점과 똑같이 확정 사주로 다시
  // 계산한다(계산 엔진 무접촉 하드룰과 무관 — LLM 재호출 없이 결정적 재계산일 뿐).
  const chart = buildChart(
    isoOf({ birthDate: profile.birth_date, birthTime: profile.birth_time, gender: profile.gender as "M" | "F", calendar: "solar" }),
    profile.gender as "M" | "F",
    !!profile.birth_time
  );
  const grouped = new Map<string, { where: string[] }>();
  for (const s of chart.sal) {
    const cur = grouped.get(s.name);
    if (cur) cur.where.push(s.where);
    else grouped.set(s.name, { where: [s.where] });
  }
  const salList: DetectedSal[] = [...grouped.entries()].map(([name, v]) => ({ name, where: v.where }));

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col pb-24">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/mypage" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          마이페이지
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">프리미엄 살풀이</h1>
      </div>

      <SavedReportClient
        content={row.content}
        sal={salList}
        target={{ birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }}
      />

      <BottomTabBar hasProfile />
    </div>
  );
}
