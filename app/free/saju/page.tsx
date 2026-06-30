"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "form" | "ad" | "result";

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

export default function FreeSajuPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ birth_date: "", birth_time: "", no_time: false, gender: "" });
  const [result, setResult] = useState<string>("");
  const [adCount, setAdCount] = useState(0);

  async function watchAd() {
    setStep("ad");
    // Simulate ad progress
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setAdCount(i);
    }
    await fetchReport();
  }

  async function fetchReport() {
    const res = await fetch("/api/free/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saju_json: null,
        kind: "saju",
        ad_token: "mock-token",
        extra: {
          birth_date: form.birth_date,
          birth_time: form.no_time ? null : form.birth_time,
          gender: form.gender,
        },
      }),
    });
    const text = await res.text();
    setResult(text);
    setStep("result");
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }}
          />
          <Link href="/" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            홈
          </Link>
          <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Free Reading</p>
          <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">무료 사주</h1>
          <p className="relative text-sm text-white/60 mt-1">광고 시청 후 핵심 사주 해설을 무료로 확인하세요</p>
        </div>

        <div className="flex-1 px-5 py-6 flex flex-col gap-5">
          {/* Birth Date */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">생년월일</label>
            <input
              type="date"
              value={form.birth_date}
              max={maxBirthDate()}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
          </div>

          {/* Birth Time */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">태어난 시각</label>
            <input
              type="time"
              disabled={form.no_time}
              value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] transition-all"
            />
            <label className="flex items-center gap-2.5 mt-2.5 text-sm text-[#6B6661] cursor-pointer select-none">
              <div
                onClick={() => setForm({ ...form, no_time: !form.no_time })}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  form.no_time ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4] bg-white"
                }`}
              >
                {form.no_time && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              시각 모름 (시주 제외)
            </label>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">성별</label>
            <div className="flex gap-2">
              {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setForm({ ...form, gender: val })}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    form.gender === val
                      ? "bg-[#1F3D34] text-white border-[#1F3D34] shadow-md"
                      : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2">
            <button
              onClick={watchAd}
              disabled={!form.birth_date || !form.gender}
              className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-[#C8743A]/25"
            >
              광고 보고 무료로 확인하기
            </button>
            <p className="text-center text-xs text-[#6B6661] mt-3">짧은 광고 시청 후 결과를 확인할 수 있어요</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ad") {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-6 bg-[#0E2521]">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#C8743A]/20 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-[#1F3D34] border-2 border-[#C8743A]/40 flex items-center justify-center text-4xl">
            📺
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">광고 시청 중...</p>
          <p className="text-white/40 text-sm">잠시만 기다려 주세요</p>
        </div>
        {/* Progress */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C8743A] rounded-full transition-all duration-500"
            style={{ width: `${(adCount / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // Result
  const lines = result.split("\n");

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #C8743A 0%, transparent 50%)" }}
        />
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Analysis Result</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">무료 사주 결과</h1>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        {/* Result card */}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <div className="w-7 h-7 rounded-full bg-[#1F3D34]/10 flex items-center justify-center">
              <span className="text-base">☯</span>
            </div>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">AI 사주 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">
            {result || "분석 중..."}
          </div>
        </div>

        {/* Upsell */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 90% 10%, #C8743A 0%, transparent 60%)" }}
          />
          <p className="relative font-bold text-base mb-1">더 자세히 알고 싶다면?</p>
          <p className="relative text-xs text-white/60 mb-4 leading-relaxed">
            직업운 · 연애운 · 건강 · 대운 전체 흐름을<br/>AI 역술가와 직접 대화하며 확인해보세요
          </p>
          <Link
            href="/street"
            className="relative block bg-[#C8743A] rounded-xl py-3 text-center text-sm font-semibold text-white active:scale-[0.97] transition-all"
          >
            AI 역술가와 대화하기 →
          </Link>
        </div>

        <button
          onClick={() => { setStep("form"); setResult(""); }}
          className="text-sm text-[#6B6661] text-center py-2 active:opacity-60"
        >
          다시 조회하기
        </button>
      </div>
    </div>
  );
}
