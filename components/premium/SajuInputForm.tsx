"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export type SavedSaju = { birth_date: string; birth_time: string | null; gender: string } | null;

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

/**
 * 리포트 화면에서 바로 쓰는 사주 입력 폼.
 *
 * 결제까지 마친 사람을 "먼저 사주를 등록하세요"로 다른 페이지에 보내면 흐름이
 * 끊긴다. 여기서 바로 입력하게 하고, 등록해 둔 사주가 있으면 한 번에 불러온다.
 *
 * 저장 규칙은 서버(/api/premium/report POST)가 정한다 — 등록된 사주가 없던
 * 사람은 본인 프로필로 저장되고, 이미 있는 사람은 1회성으로 처리된다.
 */
export function SajuInputForm({
  saved,
  busy,
  onSubmit,
}: {
  saved: SavedSaju;
  busy: boolean;
  onSubmit: (v: { birth_date: string; birth_time: string | null; gender: string }) => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [gender, setGender] = useState("");

  const canSubmit = birthDate.length === 10 && !!gender && !busy;

  function useSaved() {
    if (!saved) return;
    setBirthDate(saved.birth_date);
    // DB의 TIME은 "HH:MM:SS"로 내려오므로 앞 5글자만 쓴다.
    const t = saved.birth_time ? saved.birth_time.slice(0, 5) : "";
    setBirthTime(t);
    setNoTime(!t);
    setGender(saved.gender);
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-5">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1F3D34]">사주 정보</p>
          <p className="text-xs text-[#6B6661] mt-1 leading-relaxed">
            {saved
              ? "등록된 사주를 불러오거나, 다른 분의 사주를 입력해 보실 수 있어요."
              : "입력하신 사주는 내 사주로 저장되어 다음부터 다시 입력하지 않아도 됩니다."}
          </p>
        </div>

        {saved && (
          <button
            type="button"
            onClick={useSaved}
            className="w-full border border-[#1F3D34] text-[#1F3D34] rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all"
          >
            입력된 사주 사용 ({saved.birth_date} · {saved.gender === "M" ? "남성" : "여성"})
          </button>
        )}

        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">생년월일</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            value={birthDate}
            maxLength={10}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9]/g, "");
              if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
              if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
              setBirthDate(v.slice(0, 10));
            }}
            onBlur={() => {
              if (birthDate.length === 10 && birthDate > maxBirthDate()) {
                alert("14세 미만은 이용할 수 없습니다.");
                setBirthDate("");
              }
            }}
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-white focus:outline-none focus:border-[#1F3D34] tracking-widest"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">태어난 시각</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="HH:MM (예: 14:30)"
            disabled={noTime}
            value={birthTime}
            maxLength={5}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9]/g, "");
              if (v.length > 2) v = v.slice(0, 2) + ":" + v.slice(2);
              setBirthTime(v.slice(0, 5));
            }}
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-white disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] tracking-widest"
          />
          <label
            onClick={() => { setNoTime(!noTime); setBirthTime(""); }}
            className="flex items-center gap-2.5 mt-2.5 text-sm text-[#6B6661] cursor-pointer select-none"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${noTime ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4] bg-white"}`}>
              {noTime && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            시각 모름 (시주 제외)
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">성별</label>
          <div className="flex gap-2">
            {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  gender === val
                    ? "bg-[#1F3D34] text-white border-[#1F3D34] shadow-md"
                    : "bg-white text-[#6B6661] border-[#E5DFD4]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSubmit({ birth_date: birthDate, birth_time: noTime ? null : birthTime || null, gender })}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {busy && <Spinner />}
          {busy ? "풀이 생성 중..." : "이 사주로 풀이 보기"}
        </button>
      </div>
    </div>
  );
}
