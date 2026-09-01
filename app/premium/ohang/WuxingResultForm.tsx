"use client";

import { useState } from "react";
import type { WuxingReportData } from "@/lib/wuxing/report";
import { wuxingReportToPlainText } from "@/lib/wuxing/report";
import { WuxingReport } from "@/components/wuxing/WuxingReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";

type Step = "form" | "loading" | "result" | "deleted";

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function WuxingResultForm({ saved }: { saved: SavedSaju }) {
  const [step, setStep] = useState<Step>("form");
  const [report, setReport] = useState<WuxingReportData | null>(null);
  const [error, setError] = useState("");
  // 어떤 대상으로 만든 리포트인지 — 삭제할 때 같은 대상을 지워야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(v: Target) {
    setStep("loading");
    setError("");
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
        const msg =
          res.status === 404 ? "아직 준비 중인 리포트입니다. 조금만 기다려 주세요."
          : data.error === "profile_required" ? "먼저 사주를 등록해주세요."
          : data.error === "premium_required" ? "결제가 필요합니다."
          : "생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
        setError(msg);
        setStep("form");
        return;
      }
      setReport(data.report as WuxingReportData);
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 오행 보완 리포트를 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result" && report) {
    return (
      <div className="flex flex-col gap-4">
        <div className="print-area">
          <div className="print-card">
            <WuxingReport data={report} />
          </div>
          <PrintReportFooter />
        </div>
        <div className="px-5">
          <SaveReportButtons text={wuxingReportToPlainText(report)} title="오행 보완 리포트" />
        </div>
        <p className="no-print text-center text-[11px] text-[#9B968F] px-5">생성된 결과는 1년간 다시 볼 수 있습니다</p>
        <div className="px-5 pb-4">
          <DeleteReportButton onConfirm={handleDelete} />
        </div>
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

      {error && <p className="text-xs text-[#C0392B] px-5 pt-3">{error}</p>}

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
