import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { buildChart, rankDates } from "@/lib/saju-engine";
import type { TaekilPurpose } from "@/lib/saju-engine";
import { isoOf } from "@/lib/billing/report-target";
import { buildTaekilCard, type TaekilCardData } from "@/lib/premium/taekil-card";
import { SavedReportClient } from "./SavedReportClient";

export const metadata: Metadata = {
  title: "프리미엄 택일 | 사주거리",
};

const PURPOSE_LABEL: Record<string, string> = {
  wedding: "결혼식", move: "이사", business: "개업·계약",
  travel: "여행·출발", surgery: "수술·시술", other: "기타",
};

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 원인·동일 수정) — 택일 재열람.
 * 프로필당 여러 행(목적·기간 조합별)이라 이 리포트 자체의 PK(id)로 식별한다.
 * 소유자 본인인지만 확인하고 이용권은 검사하지 않는다.
 *
 * [리포트 7개 테이블 통합, 2026-10-02] purpose/range_from/range_to는 reports.extra에
 * 들어 있다. best(추천일 목록)는 저장해 둔 값을 그대로 보여주지 않고 — 카드와
 * 똑같이 — 같은 chart로 다시 계산한다(결정적, 재계산 비용 0).
 */
export default async function SavedTaekilReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/taekil/${id}`)}`);
  }
  const userId = session.user.id;

  const { data: row } = await supabaseAdmin
    .from("reports")
    .select("content, profile_id, variant")
    .eq("id", id).eq("user_id", userId).eq("product_id", "taekil_one")
    .maybeSingle();

  // 목적·기간은 variant("목적|시작일|종료일")에 항상 들어 있다 — extra는 저장 경로에 따라
  // 비어 있을 수 있어(신규 생성분에 한때 빠졌다) variant를 기준으로 쓴다.
  const [vPurpose, vFrom, vTo] = (row?.variant ?? "").split("|");
  const extra = { purpose: vPurpose, range_from: vFrom, range_to: vTo };

  if (!row?.content) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 리포트를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/taekil" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            새로 만들기 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  // 결과 최상단 요약 카드·추천일 목록(best) 둘 다 저장하지 않고 같은 chart로
  // 다시 계산한다(결정적, 재계산 비용 0 — 오행·살풀이와 동일 원칙).
  let card: TaekilCardData | null = null;
  let bestForClient: { date: string; weekday: string; ganji: string }[] = [];
  if (row.profile_id && extra.purpose && extra.range_from && extra.range_to) {
    try {
      const { data: profile } = await supabaseAdmin
        .from("saju_profiles")
        .select("birth_date, birth_time, gender")
        .eq("id", row.profile_id)
        .maybeSingle();
      if (profile) {
        const gender = profile.gender as "M" | "F";
        const chart = buildChart(
          isoOf({ birthDate: profile.birth_date, birthTime: profile.birth_time, gender, calendar: "solar" }),
          gender,
          !!profile.birth_time
        );
        const purpose = extra.purpose as TaekilPurpose;
        const ranked = rankDates(chart, extra.range_from, extra.range_to, purpose);
        card = buildTaekilCard(ranked, PURPOSE_LABEL[purpose] ?? purpose);
        bestForClient = ranked.best.map((d) => ({ date: d.date, weekday: d.weekday, ganji: d.ganji }));
      }
    } catch (e) {
      console.error("택일 카드 데이터 실패(카드만 생략):", e);
    }
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">프리미엄 택일</h1>
      </div>

      <SavedReportClient content={row.content} best={bestForClient} card={card} reportId={id} />

      <BottomTabBar hasProfile />
    </div>
  );
}
