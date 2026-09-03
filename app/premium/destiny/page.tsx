import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedDestinyPass, hasSajuReport } from "@/lib/billing/access";
import { DESTINY_BLUEPRINT_ONE, DESTINY_UPGRADE } from "@/lib/billing/plans";
import { DestinySamplePreview } from "@/components/blueprint/DestinySamplePreview";
import sampleFullReport from "@/lib/blueprint-engine/sample-full-report.json";
import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { DestinyReport } from "./DestinyReport";

export const metadata: Metadata = {
  title: "운명 설계도 | 사주거리",
  description: "프리미엄 사주에 평생 대운 로드맵과 인생 전환점, 실행 전략까지 더한 확장판 풀이입니다.",
  alternates: { canonical: "/premium/destiny" },
};

export default async function DestinyPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const loggedIn = !!userId;
  const premium = userId ? await isPremiumUser(userId) : false;

  let subtitle = "운명 설계도";
  // 확정 화면에 채워 넣을 등록된 내 사주(없으면 null → 빈 폼).
  let saved: { birth_date: string; birth_time: string | null; gender: string } | null = null;
  let hasProfile = false;
  let hasReport = false;
  let eligibleForUpgrade = false;
  if (userId) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles").select("id, saju_json, birth_date, birth_time, gender")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p?.birth_date) {
      saved = { birth_date: p.birth_date, birth_time: p.birth_time, gender: p.gender };
    }
    if (p?.id) {
      try {
        const { count } = await supabaseAdmin
          .from("blueprint_reports").select("saju_profile_id", { count: "exact", head: true })
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

      {/* 등록된 사주가 없어도 확정 화면에서 직접 입력할 수 있다(016 규칙대로 그
          입력이 본인 프로필로 저장된다). 그래서 "사주를 등록하세요" 안내로
          막지 않는다 — 결제까지 마친 사람을 다른 페이지로 보내면 흐름이 끊긴다. */}
      {canView ? (
        <DestinyReport saved={saved} />
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
            생계·관계·신체·공간과 시간, 네 개의 축에서 24개 질문에 답하고 평생 대운 로드맵과
            실행 설계까지 담은 확장판입니다.
          </p>

          <DestinySamplePreview
            report={sampleFullReport as unknown as BlueprintReport}
            input="예시 인물 · 2000년생 남성"
            loggedIn={loggedIn}
          />
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
