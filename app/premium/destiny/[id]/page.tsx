import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { computeAnchorFacts } from "@/lib/blueprint-engine/anchor";
import { SavedDestinyClient } from "./SavedDestinyClient";

export const metadata: Metadata = {
  title: "운명 설계도 | 사주거리",
};

/**
 * §2-11순위(CoS 실물 재검증, 2026-09-11): 운명 설계도는 리포트 ID가 없어
 * /premium/destiny 고정 경로만 있었다 — 이 경로는 "현재 확정된 대상"(대개
 * 본인 프로필)만 보여주므로, 본인 외 다른 대상(가족 등)으로 여러 건을
 * 만들면 마이페이지에서 그 결과로 돌아갈 방법이 사라졌다. 다른 6개 상품과
 * 같은 패턴 — saju_profile_id(=blueprint_reports의 PK)로 특정 리포트를
 * 직접 연다. 진행 중(생성/재생성 폴링)인 상태는 다루지 않는다 — 이 라우트는
 * 이미 완성된(status="done") 저장본만 보여준다(생성 자체는 여전히
 * /premium/destiny에서 대상을 확정해야 시작된다).
 */
export default async function SavedDestinyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(`/premium/destiny/${id}`)}`);
  }
  const userId = session.user.id;

  const [{ data: profile }, { data: row }] = await Promise.all([
    supabaseAdmin
      .from("saju_profiles")
      .select("birth_date, birth_time, gender")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("blueprint_reports")
      .select("status, content")
      .eq("saju_profile_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  let report = row?.status === "done" ? (row.content as BlueprintReport) : null;
  if (report) {
    // §0-2②와 같은 이유 — facts는 chart만으로 결정되므로 열람 시 다시 계산해
    // R1 병기·R2 한자 사전이 기존 저장본에도 즉시 반영되게 한다.
    try {
      if (report.chart) report = { ...report, facts: computeAnchorFacts(report.chart) };
    } catch (e) {
      console.error("운명 설계도(ID 열람) facts 재계산 실패, 저장본 그대로:", e);
    }
  }

  if (!profile || !row) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">저장된 설계도를 찾을 수 없어요</p>
          <p className="text-xs text-[#6B6661] leading-relaxed">삭제됐거나, 이 계정에 속한 리포트가 아닙니다.</p>
          <Link href="/premium/destiny" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            운명 설계도로 이동 →
          </Link>
        </div>
        <BottomTabBar hasProfile />
      </div>
    );
  }

  // 생성 중이거나 실패한 채로 끝난 시도 — 이 라우트는 완성본 전용이라
  // 이어서 만드는 화면(폴링·재시도 로직)으로 돌려보낸다. 같은 생년월일시로
  // 폼을 다시 확정하면 GET 라우트가 상태를 보고 이어서 생성한다.
  if (!report) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[#1A1A18]">
            {row.status === "generating" ? "아직 생성이 끝나지 않았어요" : "생성 중 문제가 있었어요"}
          </p>
          <p className="text-xs text-[#6B6661] leading-relaxed">
            {profile.birth_date}
            {profile.birth_time ? ` · ${profile.birth_time.slice(0, 5)}` : " · 시각 모름"}
            {" · "}{profile.gender === "M" ? "남성" : "여성"} 사주로 같은 정보를 다시 확정하면 이어서 진행됩니다.
          </p>
          <Link href="/premium/destiny" className="text-sm text-[#C8743A] underline underline-offset-2 mt-2">
            운명 설계도로 이동 →
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">운명 설계도</h1>
      </div>

      <SavedDestinyClient
        report={report}
        target={{ birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }}
      />

      <BottomTabBar hasProfile />
    </div>
  );
}
