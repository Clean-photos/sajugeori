"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { PrintButton, PrintReportFooter } from "@/components/premium/PrintReport";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { ReportBody } from "@/components/premium/ReportBody";

type Step = "form" | "loading" | "result" | "deleted";
type Species = "dog" | "cat";

const THIS_YEAR = new Date().getFullYear();

export function PetForm() {
  const [step, setStep] = useState<Step>("form");
  const [species, setSpecies] = useState<Species>("dog");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [noMonth, setNoMonth] = useState(false);
  const [day, setDay] = useState("");
  const [report, setReport] = useState("");
  const [petLabel, setPetLabel] = useState("");
  const [error, setError] = useState("");
  // 실패한 시도의 id. 있으면 "같은 정보로 재생성" — 서버에 저장된 입력값을 그대로 재사용한다.
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const speciesKr = species === "cat" ? "고양이" : "강아지";
  const yearNum = parseInt(year);
  const canSubmit = !!yearNum && yearNum >= 1980 && yearNum <= THIS_YEAR && (noMonth || !!parseInt(month));

  // 입력을 바꾸면 이전 실패 시도(attemptId)는 더 이상 유효하지 않다 — 새 시도로 취급.
  function clearAttempt() {
    setAttemptId(null);
    setError("");
  }

  async function submit(regenerate = false) {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/premium/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          regenerate && attemptId
            ? { attemptId }
            : {
                species,
                petName: name.trim(),
                petYear: yearNum,
                petMonth: noMonth ? null : parseInt(month),
                petDay: noMonth || !day ? null : parseInt(day),
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttemptId(typeof data.attemptId === "string" ? data.attemptId : null);
        setError(
          data.error === "profile_required"
            ? "먼저 내 사주를 등록해주세요."
            : data.error ?? "분석에 실패했습니다. 입력하신 정보는 그대로 남아 있어요."
        );
        setStep("form");
        return;
      }
      setAttemptId(null);
      setReport(cleanReportText(data.report));
      setPetLabel(
        `${data.petName} · ${data.pet.zodiac}띠 · ${data.pet.element}(${species === "cat" ? "고양이" : "강아지"})`
      );
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("form");
    }
  }

  async function handleDelete() {
    const res = await fetch("/api/premium/pet", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        species,
        petName: name.trim(),
        petYear: yearNum,
        petMonth: noMonth ? null : parseInt(month),
        petDay: noMonth || !day ? null : parseInt(day),
      }),
    });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 반려동물 궁합을 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="print-area flex flex-col gap-4">
          <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
              <span className="text-base">{species === "cat" ? "🐈" : "🐕"}</span>
              <span className="text-xs font-medium text-[#6B6661] tracking-wide">{petLabel}</span>
            </div>
            <ReportBody text={report} highlight={[name.trim()]} />
          </div>

          <div className="print-card bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
            반려동물 사주는 사람의 사주만큼 정밀하게 풀이하기 어려운 영역입니다.
            본 풀이는 오락 및 참고 목적으로 제공되며, 아이의 건강과 관련한 문제는 반드시 수의사와 상담해 주세요.
          </div>
          <PrintReportFooter />
        </div>

        <PrintButton />
        <button
          onClick={() => { setStep("form"); setReport(""); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 active:opacity-60"
        >
          다른 아이 보기
        </button>
        <p className="no-print text-center text-[11px] text-[#9B968F] -mt-2">생성된 결과는 1년간 다시 볼 수 있습니다</p>
        <DeleteReportButton onConfirm={handleDelete} />
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">
          {name.trim() || "아이"}와의 궁합을 살펴보고 있어요…
        </p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <div className="flex-1 px-5 py-6 flex flex-col gap-5">
      {/* 종 선택 */}
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">어떤 아이인가요</label>
        <div className="flex gap-2">
          {([["dog", "강아지", "🐕"], ["cat", "고양이", "🐈"]] as const).map(([val, label, icon]) => (
            <button
              key={val}
              onClick={() => { setSpecies(val); clearAttempt(); }}
              className={`flex-1 py-4 rounded-xl border text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 ${
                species === val
                  ? "bg-[#1F3D34] text-white border-[#1F3D34] shadow-md"
                  : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"
              }`}
            >
              <span className="text-2xl leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#6B6661]/70 mt-2">
          종에 따라 {speciesKr}의 행동 특성을 반영해 풀이가 달라집니다
        </p>
      </div>

      {/* 이름 */}
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">이름 (선택)</label>
        <input
          type="text"
          placeholder="예: 콩이"
          value={name}
          maxLength={20}
          onChange={(e) => { setName(e.target.value); clearAttempt(); }}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
        />
      </div>

      {/* 태어난 해 */}
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">태어난 해</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder={`예: ${THIS_YEAR - 3}`}
          value={year}
          maxLength={4}
          onChange={(e) => { setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4)); clearAttempt(); }}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all tracking-widest"
        />
        <p className="text-[11px] text-[#6B6661]/70 mt-1.5">입양한 아이라면 추정 나이로 계산한 해를 적어 주세요</p>
      </div>

      {/* 태어난 달 */}
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">태어난 달</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="1~12"
          disabled={noMonth}
          value={month}
          maxLength={2}
          onChange={(e) => { setMonth(e.target.value.replace(/[^0-9]/g, "").slice(0, 2)); clearAttempt(); }}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] transition-all tracking-widest"
        />
        <label
          onClick={() => { setNoMonth(!noMonth); if (!noMonth) { setMonth(""); setDay(""); } clearAttempt(); }}
          className="flex items-center gap-2.5 mt-2.5 text-sm text-[#6B6661] cursor-pointer select-none"
        >
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              noMonth ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4] bg-white"
            }`}
          >
            {noMonth && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          달을 몰라요
        </label>
      </div>

      {/* 태어난 날 (선택) */}
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">태어난 날 (선택)</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="1~31 (알면 더 정확해요)"
          disabled={noMonth}
          value={day}
          maxLength={2}
          onChange={(e) => { setDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2)); clearAttempt(); }}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] transition-all tracking-widest"
        />
      </div>

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

      <div className="mt-auto pt-2">
        {attemptId ? (
          <button
            onClick={() => submit(true)}
            className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25"
          >
            같은 정보로 재생성하기
          </button>
        ) : (
          <button
            onClick={() => submit(false)}
            disabled={!canSubmit}
            className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25"
          >
            {name.trim() ? `${name.trim()}와의 궁합 보기` : "궁합 보기"}
          </button>
        )}
        <p className="text-center text-xs text-[#6B6661] mt-3">등록된 내 사주와 아이의 기운을 함께 계산합니다</p>
      </div>
    </div>
  );
}
