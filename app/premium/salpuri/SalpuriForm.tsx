"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";
import { SalpuriReportResultView, type DetectedSal } from "@/components/premium/SalpuriReportResultView";

type Step = "form" | "loading" | "result" | "deleted";

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function SalpuriForm({ saved }: { saved: SavedSaju }) {
  const [step, setStep] = useState<Step>("form");
  const [report, setReport] = useState("");
  const [sal, setSal] = useState<DetectedSal[]>([]);
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 어떤 대상으로 만든 리포트인지 — 삭제할 때 같은 대상을 지워야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(v: Target) {
    setStep("loading");
    setError(null);
    setTarget(v);
    try {
      const res = await fetch("/api/premium/salpuri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(premiumErrorInfo(data, "분석에 실패했습니다. 잠시 후 다시 시도해주세요."));
        setStep("form");
        return;
      }
      setReport(cleanReportText(data.report));
      setSal(data.sal ?? []);
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  async function handleDelete() {
    // 대상 정보를 함께 보낸다 — 가족 사주로 만든 리포트를 지울 때 본인 리포트가
    // 지워지면 안 된다.
    const q = new URLSearchParams();
    if (target) {
      q.set("birth_date", target.birth_date);
      if (target.birth_time) q.set("birth_time", target.birth_time);
      q.set("gender", target.gender);
    }
    const res = await fetch(`/api/premium/salpuri?${q.toString()}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 살풀이를 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="flex flex-col gap-2">
        <SalpuriReportResultView report={report} sal={sal} onDelete={handleDelete} />
        <button onClick={() => { setStep("form"); setReport(""); setSal([]); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 -mt-4 active:opacity-60">
          다시 보기
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">사주에 들어 있는 살을 찾고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          살(殺)은 사주의 여덟 글자가 특정한 조합을 이룰 때 붙는 이름입니다.
          도화살·역마살처럼 널리 알려진 것부터 천을귀인·금여 같은 길신까지,
          사주 엔진이 아래에서 확정한 사주로 실제 검출한 살을 하나씩 짚어 풀이해 드립니다.
        </p>
        <p className="text-[13px] text-[#6B6661] leading-relaxed mt-3">
          살이 어느 자리에 있는지에 따라 작용하는 영역이 달라집니다.
          연지는 초년과 조상, 월지는 부모와 사회활동, 일지는 배우자와 본인, 시지는 자식과 말년에 대응합니다.
        </p>
      </div>

      {error && <PremiumErrorBanner error={error} />}
    </div>

      {/* 생성 직전 대상 확정 — 등록된 사주가 있으면 채워진 채로 뜨고, 체크를 풀면
          가족·친구 사주를 직접 넣을 수 있다. */}
      <SajuInputForm
        saved={saved}
        busy={false}
        confirmMode
        onSubmit={submit}
        submitLabel="이 사주로 살풀이 보기"
      />
    </>
  );
}
