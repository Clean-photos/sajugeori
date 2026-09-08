"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";
import { YearlyReportResultView } from "@/components/premium/YearlyReportResultView";

type Step = "form" | "loading" | "result" | "deleted";

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function YearlyForm({ saved }: { saved: SavedSaju }) {
  const thisYear = new Date().getFullYear();
  const [step, setStep] = useState<Step>("form");
  const [year, setYear] = useState(thisYear);
  const [report, setReport] = useState("");
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 어떤 대상으로 만든 리포트인지 — 삭제할 때 같은 대상을 지워야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(v: Target) {
    setStep("loading");
    setError(null);
    setTarget(v);
    try {
      const res = await fetch("/api/premium/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, ...v }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(premiumErrorInfo(data, "분석에 실패했습니다. 잠시 후 다시 시도해주세요."));
        setStep("form");
        return;
      }
      setReport(cleanReportText(data.report));
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  async function handleDelete() {
    const res = await fetch("/api/premium/yearly", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      // 대상 정보를 함께 보낸다 — 가족 사주로 만든 리포트를 지울 때 본인 리포트가
      // 지워지면 안 된다.
      body: JSON.stringify({ year, ...(target ?? {}) }),
    });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 연운세를 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="flex flex-col gap-2">
        <YearlyReportResultView report={report} year={year} onDelete={handleDelete} />
        <button onClick={() => { setStep("form"); setReport(""); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 -mt-4 active:opacity-60">
          다른 해 보기
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">{year}년 세운과 월운을 계산하고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">조회할 연도</label>
        <div className="flex gap-2">
          {[thisYear, thisYear + 1].map((y) => (
            <button key={y} onClick={() => setYear(y)}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${year === y ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {y}년 {y === thisYear ? "(올해)" : "(내년)"}
            </button>
          ))}
        </div>
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
        submitLabel={`이 사주로 ${year}년 운세 보기`}
      />
    </>
  );
}
