import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "프리미엄 연운세 | 사주거리",
};

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 원인·동일 수정) — 연운세 재열람.
 * premium_yearly_reports는 PK가 (saju_profile_id, year) 복합키라(자체 id 컬럼
 * 없음), 프로필 id는 경로로, 연도는 쿼리로 받는다 — 연도는 개인정보가 아니라
 * URL에 남아도 무방하다(원래 문제였던 생년월일·시각·성별과는 다르다).
 */
export default async function SavedYearlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? "") || new Date().getFullYear();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/yearly/${id}?year=${year}`)}`);
  }
  const userId = session.user.id;

  const { data: row } = await supabaseAdmin
    .from("premium_yearly_reports")
    .select("content")
    .eq("saju_profile_id", id)
    .eq("user_id", userId)
    .eq("year", year)
    .maybeSingle();

  if (!row?.content) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/yearly" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles")
    .select("birth_date, birth_time, gender")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col pb-24">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/mypage" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          마이페이지
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">프리미엄 연운세</h1>
      </div>

      <SavedReportClient
        content={row.content}
        year={year}
        target={profile ? { birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender } : null}
      />

      <BottomTabBar hasProfile />
    </div>
  );
}
