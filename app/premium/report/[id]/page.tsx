import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "프리미엄 사주 | 사주거리",
  robots: { index: false, follow: false },
};

/**
 * 9차 B(CoS 실물 확인, 2026-10-01): "다른 사주 등록하기"로 본인 프로필이 바뀌면 프리미엄
 * 사주(/premium)는 "지금의 본인"만 조회해 예전 사주로 만든 리포트가 결제 화면으로
 * 막혔다. 다른 6개 상품과 같은 패턴으로 reports.id 영구 주소를 둔다 — 소유자 본인인지만
 * 확인하고 이용권은 검사하지 않는다(이미 결제해 만든 결과를 다시 여는 것이다).
 */
export default async function SavedSajuReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/report/${id}`)}`);
  }
  const userId = session.user.id;

  const { data: row } = await supabaseAdmin
    .from("reports")
    .select("content, profile_id")
    .eq("id", id).eq("user_id", userId).eq("product_id", "saju_one")
    .maybeSingle();

  if (!row?.content) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("saju_json")
    .eq("id", row.profile_id).eq("user_id", userId).maybeSingle();
  const identity = (profile?.saju_json as { identity?: { day_master?: string; strength_label?: string } } | null)?.identity;

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col pb-24">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/mypage" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          마이페이지
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">프리미엄 사주</h1>
        {identity?.day_master && (
          <p className="relative text-sm text-white/60 mt-1">{identity.day_master}일간 · {identity.strength_label}</p>
        )}
      </div>

      <SavedReportClient content={row.content as Record<string, string>} reportId={id} />

      <BottomTabBar hasProfile />
    </div>
  );
}
