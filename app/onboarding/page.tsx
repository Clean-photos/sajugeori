"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const STEPS = ["생년월일", "태어난 시각", "성별 · 역법"];

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    birth_date: "",
    birth_time: "",
    no_time: false,
    calendar: "solar",
    gender: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/saju/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birth_date: form.birth_date,
          birth_time: form.no_time ? null : form.birth_time,
          calendar: form.calendar,
          gender: form.gender,
          persist: true,
        }),
      });
      if (!res.ok) throw new Error("계산 실패");
      // 사주거리 잠금에서 등록하러 온 경우만 사주거리로, 그 외 일반 등록은 홈으로
      router.push(from === "street" ? "/street" : "/");
    } catch {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  const canNext = [
    !!form.birth_date,
    true,
    !!form.gender,
  ][step];

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-12 pb-6 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 10% 90%, #C8743A 0%, transparent 55%)" }}
        />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-1">My Saju</p>
        <h1 className="relative font-serif text-[26px] font-bold text-white">내 사주 등록</h1>
        <p className="relative text-sm text-white/55 mt-1">한 번만 입력하면 AI 역술가들이 기억합니다</p>

        {/* Progress */}
        <div className="relative flex gap-1.5 mt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-400"
              style={{ backgroundColor: i <= step ? "#C8743A" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
        <p className="relative text-xs text-white/50 mt-2">{STEPS[step]}</p>
      </div>

      <div className="flex-1 px-5 py-8 flex flex-col">
        {/* Step 0: Birth Date */}
        {step === 0 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="text-[#1A1A18] font-medium">생년월일을 입력해주세요</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD"
              value={form.birth_date}
              maxLength={10}
              onChange={(e) => {
                let v = e.target.value.replace(/[^0-9]/g, "");
                if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                if (v.length > 10) v = v.slice(0, 10);
                setForm({ ...form, birth_date: v });
              }}
              onBlur={() => {
                if (form.birth_date.length === 10) {
                  const max = maxBirthDate();
                  if (form.birth_date > max) {
                    alert("14세 미만은 이용할 수 없습니다.");
                    setForm({ ...form, birth_date: "" });
                  }
                }
              }}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-4 text-base bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all tracking-widest"
            />
            <p className="text-xs text-[#6B6661]">예: 1990-05-23</p>
          </div>
        )}

        {/* Step 1: Time */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="text-[#1A1A18] font-medium">태어난 시각을 알고 계신가요?</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:MM (예: 14:30)"
              disabled={form.no_time}
              value={form.birth_time}
              maxLength={5}
              onChange={(e) => {
                let v = e.target.value.replace(/[^0-9]/g, "");
                if (v.length > 2) v = v.slice(0, 2) + ":" + v.slice(2);
                setForm({ ...form, birth_time: v.slice(0, 5) });
              }}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-4 text-base bg-[#FBF8F2] disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] transition-all tracking-widest"
            />
            <button
              onClick={() => setForm({ ...form, no_time: !form.no_time, birth_time: "" })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-sm text-left ${
                form.no_time
                  ? "border-[#1F3D34] bg-[#1F3D34]/5"
                  : "border-[#E5DFD4] bg-[#FBF8F2]"
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                form.no_time ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4]"
              }`}>
                {form.no_time && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[#1A1A18]">시각을 모릅니다 — 시주 없이 분석</span>
            </button>
            <p className="text-xs text-[#6B6661] leading-relaxed">
              시각을 알면 더 정확한 분석이 가능합니다.<br/>
              모르셔도 괜찮습니다.
            </p>
          </div>
        )}

        {/* Step 2: Gender + Calendar */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <p className="text-[#1A1A18] font-medium mb-3">성별</p>
              <div className="flex gap-2">
                {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, gender: val })}
                    className={`flex-1 py-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
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

            <div>
              <p className="text-[#1A1A18] font-medium mb-3">역법 (생년월일 기준)</p>
              <div className="flex gap-2">
                {[["solar", "양력 (일반)"], ["lunar", "음력"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, calendar: val })}
                    className={`flex-1 py-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                      form.calendar === val
                        ? "bg-[#1F3D34] text-white border-[#1F3D34] shadow-md"
                        : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#6B6661] mt-2">보통 주민등록 기준인 양력을 선택하세요</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-auto flex gap-3 pt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-12 h-12 rounded-xl border border-[#E5DFD4] bg-[#FBF8F2] flex items-center justify-center flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6661" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 bg-[#1F3D34] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg"
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !form.gender}
              className="flex-1 bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25"
            >
              {loading ? "사주 분석 중..." : "내 사주 확인하기 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
