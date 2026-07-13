"use client";

import { useState } from "react";

type Step = "form" | "loading" | "result";

export function YearlyForm() {
  const thisYear = new Date().getFullYear();
  const [step, setStep] = useState<Step>("form");
  const [year, setYear] = useState(thisYear);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/premium/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "profile_required" ? "먼저 사주를 등록해주세요." : "분석에 실패했습니다. 다시 시도해주세요.");
        setStep("form");
        return;
      }
      setReport(data.report);
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("form");
    }
  }

  if (step === "result") {
    return (
      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">運</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">{year}년 프리미엄 연운세</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{report}</div>
        </div>
        <button onClick={() => { setStep("form"); setReport(""); }}
          className="text-sm text-[#6B6661] text-center py-2 active:opacity-60">
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
      </div>
    );
  }

  return (
    <div className="flex-1 px-5 py-6 flex flex-col gap-5">
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

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

      <div className="mt-auto pt-2">
        <button onClick={submit}
          className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
          {year}년 운세 보기
        </button>
        <p className="text-center text-xs text-[#6B6661] mt-3">등록된 내 사주로 세운·월별 흐름을 분석합니다</p>
      </div>
    </div>
  );
}
