"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "form" | "ad" | "result";

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

const CONTEXT_OPTIONS = [
  { value: "romance", label: "연애 · 결혼" },
  { value: "work", label: "직장 · 비즈니스" },
  { value: "friend", label: "친구 · 지인" },
];

export default function FreeCompatibilityPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    my_birth: "", my_gender: "",
    other_birth: "", other_gender: "",
    context: "romance",
  });
  const [result, setResult] = useState("");
  const [adCount, setAdCount] = useState(0);

  async function watchAd() {
    setStep("ad");
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setAdCount(i);
    }
    await fetchReport();
  }

  async function fetchReport() {
    const res = await fetch("/api/free/compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ad_token: "mock-token" }),
    });
    setResult(await res.text());
    setStep("result");
  }

  const canSubmit = form.my_birth && form.my_gender && form.other_birth && form.other_gender;

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
          <Link href="/" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            홈
          </Link>
          <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Free Reading</p>
          <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">무료 궁합</h1>
          <p className="relative text-sm text-white/60 mt-1">두 사람의 사주로 인연의 깊이를 확인하세요</p>
        </div>

        <div className="flex-1 px-5 py-6 flex flex-col gap-6">
          {/* 관계 유형 */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">관계 유형</label>
            <div className="flex gap-2">
              {CONTEXT_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setForm({ ...form, context: o.value })}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.context === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 나 */}
          <div>
            <p className="text-sm font-semibold text-[#1A1A18] mb-3">나</p>
            <div className="flex flex-col gap-2">
              <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD"
                value={form.my_birth} maxLength={10}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, my_birth: v.slice(0, 10) });
                }}
                className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
              <div className="flex gap-2">
                {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, my_gender: v })}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.my_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상대 */}
          <div>
            <p className="text-sm font-semibold text-[#1A1A18] mb-3">상대방</p>
            <div className="flex flex-col gap-2">
              <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD"
                value={form.other_birth} maxLength={10}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, other_birth: v.slice(0, 10) });
                }}
                className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
              <div className="flex gap-2">
                {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, other_gender: v })}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.other_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button onClick={watchAd} disabled={!canSubmit}
              className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
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
          <div className="w-20 h-20 rounded-full bg-[#1F3D34] border-2 border-[#C8743A]/40 flex items-center justify-center text-4xl">📺</div>
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">광고 시청 중...</p>
          <p className="text-white/40 text-sm">잠시만 기다려 주세요</p>
        </div>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#C8743A] rounded-full transition-all duration-500" style={{ width: `${(adCount / 3) * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #C8743A 0%, transparent 50%)" }} />
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Analysis Result</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">궁합 결과</h1>
      </div>
      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">∞</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">AI 궁합 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{result || "분석 중..."}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, #C8743A 0%, transparent 60%)" }} />
          <p className="relative font-bold text-base mb-1">더 깊은 궁합 분석이 필요하다면?</p>
          <p className="relative text-xs text-white/60 mb-4 leading-relaxed">AI 역술가와 직접 대화하며 궁합의 세부 흐름을 확인하세요</p>
          <Link href="/street" className="relative block bg-[#C8743A] rounded-xl py-3 text-center text-sm font-semibold text-white active:scale-[0.97] transition-all">
            AI 역술가와 대화하기 →
          </Link>
        </div>
        <button onClick={() => { setStep("form"); setResult(""); }} className="text-sm text-[#6B6661] text-center py-2 active:opacity-60">
          다시 조회하기
        </button>
      </div>
    </div>
  );
}
