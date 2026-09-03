"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { CalendarField } from "@/app/free/CalendarField";
import { toSolar, type CalendarKind } from "@/lib/calendar/convert";
import { BirthDateConfirmBanner } from "@/components/BirthDateConfirmBanner";

const STEPS = ["생년월일", "태어난 시각", "성별 · 역법"];

export type ExistingProfile = {
  day_master: string;
  strength_label: string;
  birth_date: string;
  gender: string;
  /** §1 도입 전 저장분(음력이 양력 칸에 들어갔을 수 있음)이고 아직 본인 확인 전. */
  needsBirthDateConfirm: boolean;
} | null;

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

function OnboardingInner({ existingProfile }: { existingProfile: ExistingProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  // 등록 후 돌아갈 곳. 결제까지 마치고 사주 등록으로 넘어온 사람을 홈으로
  // 떨어뜨리지 않기 위해 호출부가 next를 넘긴다. 외부 URL로 튕기지 않도록
  // 사이트 내부 경로("/로 시작하되 //가 아닌")만 허용한다.
  const nextParam = searchParams.get("next");
  const nextPath = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : null;
  // 등록된 사주가 있으면 먼저 그 사주를 보여주고, "다시 등록"을 눌러야 폼으로 들어간다.
  const [showForm, setShowForm] = useState(!existingProfile);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    birth_date: "",
    birth_time: "",
    no_time: false,
    calendar: "solar",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  // 이번 음력 사고의 직접 원인이 여기였다 — 서버가 보낸 구체적인 사유를 버리고
  // "오류가 발생했습니다"로 뭉개서, 사용자는 왜 실패하는지 알 방법이 없었다.
  // 이제 서버 응답의 error 필드를 그대로 신뢰해서 보여준다(이 API는 원본 예외를
  // 그대로 노출하지 않고, saju-engine이 던지는 문구도 전부 사람이 읽을 한국어다).
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const conv = toSolar(form.birth_date, form.calendar as CalendarKind);
    if (!conv.ok) { setError(conv.error); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/saju/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 엔진은 양력만 받는다. 음력으로 골랐어도 여기서 변환해 보낸다.
          birth_date: conv.solar,
          birth_time: form.no_time ? null : form.birth_time,
          calendar: "solar",
          gender: form.gender,
          persist: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "사주 계산에 실패했습니다. 입력값을 확인해 주세요.");
        return;
      }
      // next가 있으면 원래 보려던 화면으로, 사주거리 잠금에서 왔으면 사주거리로,
      // 그 외 일반 등록은 홈으로.
      router.push(nextPath ?? (from === "street" ? "/street" : "/"));
      router.refresh();
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const canNext = [
    !!form.birth_date,
    true,
    !!form.gender,
  ][step];

  // 이미 등록된 사주 요약 — "다시 등록"을 누르기 전까지는 이 화면만 보여준다.
  if (!showForm && existingProfile) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="relative overflow-hidden px-6 pt-12 pb-8 bg-[#1F3D34]">
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
          <h1 className="relative font-serif text-[26px] font-bold text-white">이미 등록된 사주가 있어요</h1>
        </div>

        <div className="flex-1 px-5 py-8 flex flex-col gap-5">
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
            <p className="text-base font-semibold text-[#1A1A18]">
              {existingProfile.day_master} · {existingProfile.strength_label}
            </p>
            <p className="text-sm text-[#6B6661] mt-1">
              {existingProfile.birth_date} · {existingProfile.gender === "M" ? "남성" : "여성"}
            </p>
          </div>

          {existingProfile.needsBirthDateConfirm && (
            <BirthDateConfirmBanner birthDate={existingProfile.birth_date} />
          )}

          <Link
            href="/premium"
            className="text-center bg-[#1F3D34] text-white rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all shadow-lg"
          >
            이 사주로 프리미엄 리포트 보기
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="text-center border border-[#E5DFD4] text-[#1F3D34] rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all"
          >
            사주 다시 등록하기
          </button>
          <p className="text-xs text-[#6B6661] text-center leading-relaxed">
            다시 등록하면 기존 사주로 저장된 프리미엄 리포트도 함께 사라져요.
          </p>
        </div>
      </div>
    );
  }

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
        <p className="relative text-sm text-white/55 mt-1">한 번만 입력하면 다시 입력할 필요 없이 저장됩니다</p>

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

            {/* 역법 선택 + 변환 즉시 표시. 무료 폼과 같은 조각을 쓴다. */}
            <div>
              <p className="text-[#1A1A18] font-medium mb-3">역법 (생년월일 기준)</p>
              <CalendarField
                birthDate={form.birth_date}
                calendar={form.calendar as CalendarKind}
                onChange={(k) => setForm({ ...form, calendar: k })}
              />
              <p className="text-xs text-[#6B6661] mt-2">
                주민등록 기준이면 양력입니다. 음력 생일을 쓰신다면 음력을 선택해 주세요.
              </p>
            </div>

            {error && (
              <p className="text-xs text-[#C0392B] bg-[#C0392B]/8 border border-[#C0392B]/25 rounded-xl px-3.5 py-3 leading-relaxed">
                {error}
              </p>
            )}
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
              className="flex-1 flex items-center justify-center gap-2 bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25"
            >
              {loading && <Spinner />}
              {loading ? "사주를 저장 중..." : "내 사주 확인하기 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OnboardingClient({ existingProfile }: { existingProfile: ExistingProfile }) {
  return (
    <Suspense fallback={null}>
      <OnboardingInner existingProfile={existingProfile} />
    </Suspense>
  );
}
