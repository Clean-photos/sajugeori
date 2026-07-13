"use client";

import { useState } from "react";

type Step = "form" | "loading" | "result";

const CONTEXT_OPTIONS = [
  { value: "romance", label: "연애 · 결혼" },
  { value: "work", label: "직장 · 비즈니스" },
  { value: "friend", label: "친구 · 지인" },
];

function formatDateInput(raw: string) {
  let v = raw.replace(/[^0-9]/g, "");
  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
  return v.slice(0, 10);
}

export function CompatForm() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ partner_birth: "", partner_gender: "", context: "romance" });
  const [report, setReport] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/premium/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "profile_required" ? "먼저 내 사주를 등록해주세요." : "분석에 실패했습니다. 다시 시도해주세요.");
        setStep("form");
        return;
      }
      setReport(data.report);
      setScore(data.score ?? null);
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("form");
    }
  }

  const canSubmit = form.partner_birth.length === 10 && form.partner_gender;

  if (step === "result") {
    return (
      <div className="px-5 py-6 flex flex-col gap-4">
        {score !== null && (
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-6 text-center">
            <p className="text-xs text-white/60 mb-1">종합 궁합</p>
            <p className="text-4xl font-bold text-[#C8743A]">{score}<span className="text-lg text-white/50">점</span></p>
          </div>
        )}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">∞</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 궁합 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{report}</div>
        </div>
        <button onClick={() => { setStep("form"); setReport(""); setScore(null); }}
          className="text-sm text-[#6B6661] text-center py-2 active:opacity-60">
          다른 상대와 보기
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">두 사주를 맞춰보고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-5 py-6 flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">관계 유형</label>
        <div className="grid grid-cols-3 gap-2">
          {CONTEXT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setForm({ ...form, context: o.value })}
              className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${form.context === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">상대방 생년월일</label>
        <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.partner_birth} maxLength={10}
          onChange={(e) => setForm({ ...form, partner_birth: formatDateInput(e.target.value) })}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">상대방 성별</label>
        <div className="flex gap-2">
          {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
            <button key={v} onClick={() => setForm({ ...form, partner_gender: v })}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${form.partner_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

      <div className="mt-auto pt-2">
        <button onClick={submit} disabled={!canSubmit}
          className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
          내 사주와 궁합 보기
        </button>
        <p className="text-center text-xs text-[#6B6661] mt-3">등록된 내 사주와 상대를 양방향으로 분석합니다</p>
      </div>
    </div>
  );
}
