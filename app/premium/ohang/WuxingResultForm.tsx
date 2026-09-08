"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WuxingReportData } from "@/lib/wuxing/report";
import { WuxingReportResultView } from "@/components/wuxing/WuxingReportResultView";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";

type Step = "form" | "loading" | "result";

type Target = { birth_date: string; birth_time: string | null; gender: string };

/**
 * §1(CoS 결정 2026-09-08): 이 폼은 "새로 만들기" 전용이다. 예전엔 마이페이지
 * "보기 →"가 birth_date 등을 쿼리로 실어 이 폼을 자동 제출시켰는데(autostart),
 * 그건 재열람이 아니라 재생성 요청이라 1회권 소진자는 결제 게이트에 막혔다
 * (실측: 990원 결제 → 정상 생성·열람 → 재진입 시 페이월 재노출). 저장된
 * 리포트를 다시 보는 경로는 이제 이용권 검사가 아예 없는
 * app/premium/ohang/[id]가 맡는다 — 이 폼은 되돌아오지 않는다.
 */
export function WuxingResultForm({ saved }: { saved: SavedSaju }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [report, setReport] = useState<WuxingReportData | null>(null);
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 저장된 saju_profile_id — 생성 직후 "다시보기" 영구 링크로 안내하기 위해 보관.
  const [profileId, setProfileId] = useState<string | null>(null);
  // 어떤 대상으로 만든 리포트인지 — 삭제할 때 같은 대상을 지워야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(v: Target) {
    setStep("loading");
    setError(null);
    setTarget(v);
    try {
      const res = await fetch("/api/premium/wuxing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) {
        // WUXING_ENABLED가 꺼져 있으면 404 — 결제 게이트를 통과했더라도(구독자 등)
        // 아직 준비 중이라고 안내한다("생성 실패"로 보이면 버그처럼 읽힌다).
        setError(
          res.status === 404
            ? { message: "아직 준비 중인 리포트입니다. 조금만 기다려 주세요." }
            : premiumErrorInfo(data, "생성에 실패했습니다. 잠시 후 다시 시도해주세요.")
        );
        setStep("form");
        return;
      }
      setReport(data.report as WuxingReportData);
      setProfileId(typeof data.profileId === "string" ? data.profileId : null);
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  async function handleDelete() {
    // 대상 정보를 함께 보낸다 — 가족 사주로 만든 리포트를 지울 때 본인 리포트가
    // 지워지면 안 된다(예전 DELETE는 항상 본인 것만 지웠다).
    const q = new URLSearchParams();
    if (target) {
      q.set("birth_date", target.birth_date);
      if (target.birth_time) q.set("birth_time", target.birth_time);
      q.set("gender", target.gender);
    }
    const res = await fetch(`/api/premium/wuxing?${q.toString()}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  if (step === "result" && report) {
    return (
      <div className="flex flex-col gap-2">
        <WuxingReportResultView report={report} onDelete={handleDelete} />
        {profileId && (
          <p className="no-print text-center text-[11px] text-[#9B968F] px-5 -mt-2">
            마이페이지에서 언제든 다시 열어볼 수 있어요
          </p>
        )}
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">오행 지도와 3년 처방을 준비하고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 30초 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-sm text-[#1A1A18] leading-relaxed px-5 pt-6">
        오행 지도, 채우는 법, 어울리는 사람, 3년 세운 처방까지 한 번에 만들어 드립니다.
      </p>

      {error && <div className="px-5 pt-3"><PremiumErrorBanner error={error} /></div>}

      {/* 생성 직전 대상 확정 — 등록된 사주가 있으면 채워진 채로 뜨고, 체크를 풀면
          가족·친구 사주를 직접 넣을 수 있다. */}
      <SajuInputForm
        saved={saved}
        busy={false}
        confirmMode
        onSubmit={submit}
        submitLabel="이 사주로 리포트 만들기"
      />
    </div>
  );
}
