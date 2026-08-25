import type { Metadata } from "next";
import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass } from "@/lib/billing/access";
import { ONE_REPORT_PRICE } from "@/lib/billing/plans";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { SamplePreview } from "@/components/premium/SamplePreview";
import { PremiumReport } from "./PremiumReport";

export const metadata: Metadata = {
  title: "프리미엄 사주 — 실제 계산 데이터로 깊이 있게 | 사주거리",
  description:
    "일간·오행·용신·대운까지 실제로 계산한 데이터를 근거로 성격·직업·재물·연애·건강·인생 패턴을 깊이 있게 풀이하는 프리미엄 사주 리포트입니다.",
  alternates: { canonical: "/premium" },
};

export default async function PremiumPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const loggedIn = !!userId;
  const premium = userId ? await isPremiumUser(userId) : false;

  // 헤더에 실제 일주·강약 표시
  let subtitle = "내 사주 풀이";
  let hasProfile = false;
  let hasReport = false;   // 이미 생성해 둔 풀이(이용권 소진 후 재열람용)
  if (userId) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles").select("id, saju_json")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p?.id) {
      try {
        const { count } = await supabaseAdmin
          .from("premium_reports").select("saju_profile_id", { count: "exact", head: true })
          .eq("saju_profile_id", p.id);
        hasReport = (count ?? 0) > 0;
      } catch { /* 테이블 없음 → 미보유로 간주 */ }
    }
    if (p?.saju_json?.identity) {
      hasProfile = true;
      const dm = p.saju_json.identity.day_master ?? "";
      const st = p.saju_json.identity.strength_label ?? "";
      subtitle = [dm && `${dm}일간`, st].filter(Boolean).join(" · ") || subtitle;
    }
  }

  // 구독자 · 미사용 이용권 보유자 · 이미 리포트를 받은 사람은 바로 열람.
  // 최종 권한 판정과 이용권 소진은 API(/api/premium/report)가 하고, 여기서는 화면 분기만 한다.
  const hasPass = !premium && userId ? (await findUnusedOneTimePass(userId, "saju_one")) !== null : false;
  const canView = premium || hasPass || hasReport;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      <header className="px-5 pt-6 pb-4 bg-[#1B3A4B] text-white">
        <p className="text-xs opacity-70 mb-1">프리미엄 사주</p>
        <h1 className="text-xl font-bold">내 사주 풀이</h1>
        <p className="text-xs opacity-60 mt-1">{subtitle}</p>
      </header>

      {canView ? (
        hasProfile ? (
          <PremiumReport />
        ) : (
          <div className="px-4 pt-6">
            <Link href="/onboarding?next=%2Fpremium" className="block rounded-2xl bg-[#1B3A4B] text-white px-5 py-4 text-center text-sm font-semibold">
              풀이를 보려면 사주를 등록하세요
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="px-4 pt-4">
            <Link
              href={loggedIn ? "/premium/buy?product=saju_one" : "/login?redirect=/premium"}
              className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
            >
              <p className="text-sm font-semibold">전체 풀이 열람하기</p>
              <p className="text-xs opacity-80 mt-0.5">
                {ONE_REPORT_PRICE.toLocaleString()}원 · 1회 결제
              </p>
            </Link>
          </div>

          <div className="px-4 pt-3 pb-4">
            <SamplePreview sample={SAMPLE_REPORTS.saju} />
          </div>
        </>
      )}

      <BottomTabBar />
    </div>
  );
}
