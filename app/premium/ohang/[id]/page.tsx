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
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "오행 보완 리포트 | 사주거리",
};

/**
 * §1(CoS 결정 2026-09-08): "1회권 구매자는 결제한 리포트를 다시 볼 수 없다" —
 * 실측 원인은 마이페이지 "보기 →"가 저장본을 부르는 게 아니라 같은 조건으로
 * 다시 만들라는 요청(autostart)이었고, 그 요청은 이용권이 이미 "사용함"이라
 * 결제 게이트에 막혔다. 이 라우트는 그 문제를 근본적으로 없앤다:
 *   - 열람은 saju_profile_id(=id)로만 식별한다. 생년월일·시각·성별을 URL에
 *     싣지 않는다(부수 결함 — 개인정보가 쿼리에 평문으로 남던 문제도 함께 해소).
 *   - 소유자 본인인지만 확인하고, 이용권/구독 여부는 전혀 검사하지 않는다 —
 *     이미 결제해 만들어 둔 결과를 다시 보는 것이라 재결제를 요구하면 안 된다.
 */
export default async function SavedWuxingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/ohang/${id}`)}`);
  }
  const userId = session.user.id;

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("premium_wuxing_reports")
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

  // §0-2①(CoS 실물 재검증, 2026-09-10): 저장본을 그대로 렌더하면 결정형 계층
  // (용신 카드·처방 항목·조후 충돌 필터 등)이 **생성 시점 코드에 그대로 얼어붙어**,
  // 이후 배포한 수정(§4-1 조후 필터·§4-2 P4·§1 병기…)이 기존 리포트에 절대
  // 반영되지 않는다 — "완료 보고 후에도 배포본에 그대로"의 실제 원인. 결정형
  // 계층은 재계산 비용이 사실상 0이므로, 열람 시 사주로부터 다시 조립하고
  // 저장본에서는 LLM이 만든 narratives(한 줄 진단 보충·3년 흐름)만 가져와 끼운다.
  // (엔진은 읽기 전용 — 계산 로직 무접촉)
  let report = row?.content as WuxingReportData | undefined;
  if (report && profile) {
    try {
      const cachedYear = report.seun?.years?.[0]?.year;
      // birth_time은 "HH:MM" / "HH:MM:SS" / null 이 섞여 온다. 초를 무조건
      // 덧붙이면 "…T14:30:00:00" → Invalid Date (2026-09-02 사고). 길이로 가른다.
      const t = profile.birth_time
        ? profile.birth_time.length === 5
          ? `${profile.birth_time}:00`
          : profile.birth_time
        : "00:00:00";
      const chart = buildChart(`${profile.birth_date}T${t}`, profile.gender, !!profile.birth_time);
      const cls = classify(chart);
      report = buildWuxingReport(chart, cls, report.narratives ?? {}, cachedYear);

      const { narratives, patched } = await backfillMissingNarratives(chart, cls, report);
      if (patched) {
        report = { ...report, narratives };
        const savedContent = row!.content as WuxingReportData;
        await supabaseAdmin
          .from("premium_wuxing_reports")
          .update({ content: { ...savedContent, narratives } })
          .eq("saju_profile_id", id)
          .eq("user_id", userId);
      }
    } catch (e) {
      console.error("오행 저장본 재조립 실패, 저장본 그대로 렌더:", e);
    }
  }

  if (!report || !profile) {
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
        target={{ birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }}
      />

      <BottomTabBar hasProfile />
    </div>
  );
}
