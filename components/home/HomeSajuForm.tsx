"use client";

// §1(2/3 문서, CEO 결정 2026-09-03): 홈 재설계의 핵심 변경.
// 기존 흐름 "홈 → 무료 사주 페이지 → 입력"(3단계)에서 55명 중 53명이 샜다.
// 이 폼을 홈 첫 화면에 직접 두고, 제출 즉시 /free/saju로 넘겨 그 페이지의
// 광고 게이트·로딩·결과 로직을 그대로 이어 쓴다(autostart=1) — 이미 검증된
// 흐름을 두 번 만들지 않기 위해서다. 입력은 홈에서 끝내고, 그 다음부터는
// 기존 무료 사주 페이지가 이어받는 구조.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarField } from "@/app/free/CalendarField";
import { toSolar, type CalendarKind } from "@/lib/calendar/convert";

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

export function HomeSajuForm() {
  const router = useRouter();
  const [form, setForm] = useState({ birth_date: "", birth_time: "", no_time: false, gender: "" });
  const [calendar, setCalendar] = useState<CalendarKind>("solar");
  const conv = form.birth_date.length === 10 ? toSolar(form.birth_date, calendar) : null;
  const solarBirthDate = conv?.ok ? conv.solar : "";

  function submit() {
    if (!solarBirthDate || !form.gender) return;
    const params = new URLSearchParams({
      birth_date: solarBirthDate,
      gender: form.gender,
      autostart: "1",
    });
    if (!form.no_time && form.birth_time) params.set("birth_time", form.birth_time);
    router.push(`/free/saju?${params.toString()}`);
  }

  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 flex flex-col gap-3.5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">생년월일</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="YYYY-MM-DD"
          value={form.birth_date}
          maxLength={10}
          onChange={(e) => {
            let v = e.target.value.replace(/[^0-9]/g, "");
            if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
            if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
            setForm({ ...form, birth_date: v.slice(0, 10) });
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
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-base bg-white focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all tracking-widest"
        />
        <CalendarField birthDate={form.birth_date} calendar={calendar} onChange={setCalendar} />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">태어난 시각</label>
        <div className="flex gap-2">
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
            className="flex-1 border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-base bg-white disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] transition-all tracking-widest"
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, no_time: !form.no_time, birth_time: "" })}
            className={`px-3.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
              form.no_time ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-white text-[#6B6661] border-[#E5DFD4]"
            }`}
          >
            모름
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">성별</label>
        <div className="flex gap-2">
          {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm({ ...form, gender: val })}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                form.gender === val
                  ? "bg-[#1F3D34] text-white border-[#1F3D34] shadow-sm"
                  : "bg-white text-[#6B6661] border-[#E5DFD4]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* §4(1/3 문서)와 동일 원칙 — 비활성 이유를 버튼 문구로. */}
      <button
        type="button"
        onClick={submit}
        disabled={!solarBirthDate || !form.gender}
        className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25"
      >
        {!solarBirthDate ? "생년월일을 입력해주세요" : !form.gender ? "성별을 선택해주세요" : "무료로 내 사주 보기"}
      </button>
      <p className="text-center text-xs text-[#6B6661] -mt-1.5">회원가입 없음 · 광고 5초</p>
    </div>
  );
}
