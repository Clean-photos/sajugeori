import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedDestinyPass, hasSajuReport } from "@/lib/billing/access";
import { DESTINY_BLUEPRINT_ONE, DESTINY_UPGRADE } from "@/lib/billing/plans";
import { DestinyReport } from "./DestinyReport";

export const metadata: Metadata = {
  title: "운명 설계도 | 사주거리",
  description: "프리미엄 사주에 평생 대운 로드맵과 인생 전환점, 실행 전략까지 더한 확장판 풀이입니다.",
  robots: { index: false },
};

export default async function DestinyPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const loggedIn = !!userId;
  const premium = userId ? await isPremiumUser(userId) : false;

  let subtitle = "운명 설계도";
  let hasProfile = false;
  let hasReport = false;
  let eligibleForUpgrade = false;
  if (userId) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles").select("id, saju_json")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p?.id) {
      try {
        const { count } = await supabaseAdmin
          .from("premium_destiny_reports").select("saju_profile_id", { count: "exact", head: true })
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
    eligibleForUpgrade = await hasSajuReport(userId);
  }

  const hasPass = !premium && userId ? (await findUnusedDestinyPass(userId)) !== null : false;
  const canView = premium || hasPass || hasReport;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      <header className="px-5 pt-6 pb-4 bg-[#1F3D34] text-white">
        <p className="text-xs opacity-70 mb-1">운명 설계도</p>
        <h1 className="text-xl font-bold">확장판 사주 풀이</h1>
        <p className="text-xs opacity-60 mt-1">{subtitle}</p>
      </header>

      {canView ? (
        hasProfile ? (
          <DestinyReport />
        ) : (
          <div className="px-4 pt-6">
            <Link href="/onboarding" className="block rounded-2xl bg-[#1F3D34] text-white px-5 py-4 text-center text-sm font-semibold">
              풀이를 보려면 사주를 등록하세요
            </Link>
          </div>
        )
      ) : (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {eligibleForUpgrade && (
            <Link
              href="/premium/buy?product=destiny_upgrade"
              className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
            >
              <p className="text-sm font-semibold">이미 본 프리미엄 사주에 이어서 업그레이드</p>
              <p className="text-xs opacity-80 mt-0.5">
                차액 {DESTINY_UPGRADE.amount.toLocaleString()}원만 추가로
              </p>
            </Link>
          )}
          <Link
            href={loggedIn ? "/premium/buy?product=destiny_blueprint_one" : "/login?redirect=/premium/destiny"}
            className={`block rounded-2xl px-5 py-4 text-center ${
              eligibleForUpgrade ? "border border-[#1F3D34] text-[#1F3D34]" : "bg-[#C8743A] text-white"
            }`}
          >
            <p className="text-sm font-semibold">운명 설계도 전체 열람하기</p>
            <p className="text-xs opacity-80 mt-0.5">
              {DESTINY_BLUEPRINT_ONE.amount.toLocaleString()}원 · 1회 결제
            </p>
          </Link>
          <p className="text-xs text-[#6B6661] px-1 leading-relaxed">
            프리미엄 사주의 여덟 영역에 평생 대운 로드맵, 인생 전환점, 실행 전략까지 더한
            확장판입니다.
          </p>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
