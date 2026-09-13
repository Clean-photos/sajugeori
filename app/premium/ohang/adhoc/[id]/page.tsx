import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import type { WuxingReportData } from "@/lib/wuxing/report";
import { buildWuxingReport } from "@/lib/wuxing/report";
import { backfillMissingNarratives } from "@/lib/wuxing/narrative-backfill";
import { buildChart } from "@/lib/saju-engine/engine";
import { classify } from "@/lib/wuxing/classify";
import { SavedReportClient } from "../../[id]/SavedReportClient";

export const metadata: Metadata = {
  title: "오행 보완 리포트 | 사주거리",
};

/**
 * §0-2⑥(CoS 실물 재검증, 2026-09-10): "오행 (구 생성분 1건) — /premium/ohang,
 * ID 없음" — 본인 프로필과 다른 대상으로 만든 오행 리포트는 premium_wuxing_reports
 * (saju_profile_id PK)가 아니라 premium_adhoc_reports(018, 자체 PK)에 저장되는데,
 * 마이페이지가 이 테이블 출신 항목엔 열람 라우트를 안 만들어(lib/billing/my-reports.ts
 * "018 전용 열람 라우트가 아직 없다") 항상 정적 href(빈 폼)로 떨어졌다. 이 테이블도
 * 자체 id(PK)를 갖고 있어 같은 패턴(id 기반 소유자 확인 열람)을 그대로 적용한다.
 *
 * [id]/page.tsx와 동일하게 결정형 계층은 열람 시 재조립한다(§0-2①) — 저장본에서는
 * narratives만 가져온다.
 */
export default async function SavedAdhocWuxingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/ohang/adhoc/${id}`)}`);
  }
  const userId = session.user.id;

  const { data: row } = await supabaseAdmin
    .from("premium_adhoc_reports")
    .select("content, birth_date, birth_time, gender, product_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  let report = row?.content as WuxingReportData | undefined;
  if (report && row && row.product_id === "wuxing_one") {
    try {
      const cachedYear = report.seun?.years?.[0]?.year;
      const t = row.birth_time
        ? row.birth_time.length === 5
          ? `${row.birth_time}:00`
          : row.birth_time
        : "00:00:00";
      const chart = buildChart(`${row.birth_date}T${t}`, row.gender, !!row.birth_time);
      const cls = classify(chart);
      report = buildWuxingReport(chart, cls, report.narratives ?? {}, cachedYear);

      const { narratives, patched } = await backfillMissingNarratives(chart, cls, report);
      if (patched) {
        report = { ...report, narratives };
        const savedContent = row.content as WuxingReportData;
        await supabaseAdmin
          .from("premium_adhoc_reports")
          .update({ content: { ...savedContent, narratives } })
          .eq("id", id)
          .eq("user_id", userId);
      }
    } catch (e) {
      console.error("오행(대상 지정) 저장본 재조립 실패, 저장본 그대로 렌더:", e);
    }
  }

  if (!report || !row || row.product_id !== "wuxing_one") {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/ohang" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">오행 보완 리포트</h1>
      </div>

      <SavedReportClient
        report={report}
        target={{ birth_date: row.birth_date, birth_time: row.birth_time, gender: row.gender }}
      />

      <BottomTabBar hasProfile />
    </div>
  );
}
