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
  confirmMode = false,
  submitLabel,
  busyLabel,
}: {
  saved: SavedSaju;
  busy: boolean;
  onSubmit: (v: { birth_date: string; birth_time: string | null; gender: string }) => void;
  /**
   * 생성 직전 "이 사주가 맞는지" 확정하는 화면으로 쓸 때 true.
   * 등록된 사주가 있으면 체크박스가 켜진 채로 값이 채워져 나오고, 유저는 확인만
   * 하면 된다. 체크를 풀면 빈 폼이 되어 가족·친구 사주를 직접 넣을 수 있다.
   * (기본 false — 기존 프리미엄 사주 화면의 "불러오기 버튼" 동작을 그대로 둔다)
   */
  confirmMode?: boolean;
  submitLabel?: string;
  busyLabel?: string;
}) {
  // confirmMode에서는 등록된 사주를 처음부터 채워 둔다("생성 직전 컨펌" 구조).
  const prefill = confirmMode && saved;
  const savedTime = saved?.birth_time ? saved.birth_time.slice(0, 5) : "";
  const [birthDate, setBirthDate] = useState(prefill ? saved.birth_date : "");
  const [birthTime, setBirthTime] = useState(prefill ? savedTime : "");
  const [noTime, setNoTime] = useState(prefill ? !savedTime : false);
  const [gender, setGender] = useState(prefill ? saved.gender : "");
  const [useOwn, setUseOwn] = useState(!!prefill);

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

  // 체크박스 토글 — 켜면 등록된 사주를 불러오고, 끄면 빈 폼으로 되돌린다.
  function toggleUseOwn() {
    const next = !useOwn;
    setUseOwn(next);
    if (next) { useSaved(); return; }
    setBirthDate(""); setBirthTime(""); setNoTime(false); setGender("");
  }

  // 값을 직접 고치면 "등록한 내 사주"가 더 이상 아니므로 체크를 자동으로 푼다.
  function edited() {
    if (useOwn) setUseOwn(false);
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-5">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1F3D34]">
            {confirmMode ? "누구의 사주로 볼까요?" : "사주 정보"}
          </p>
          <p className="text-xs text-[#6B6661] mt-1 leading-relaxed">
            {confirmMode
              ? "이 정보로 리포트를 만듭니다. 다른 분의 사주를 보시려면 아래 체크를 풀고 직접 입력해 주세요."
              : saved
                ? "등록된 사주를 불러오거나, 다른 분의 사주를 입력해 보실 수 있어요."
                : "입력하신 사주는 내 사주로 저장되어 다음부터 다시 입력하지 않아도 됩니다."}
          </p>
        </div>

        {/* 확정 화면에서는 체크박스, 기존 화면에서는 불러오기 버튼 */}
        {saved && confirmMode && (
          <label
            onClick={toggleUseOwn}
            className="flex items-start gap-2.5 text-sm text-[#1A1A18] cursor-pointer select-none bg-white border border-[#E5DFD4] rounded-xl px-3.5 py-3"
          >
            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${useOwn ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4] bg-white"}`}>
              {useOwn && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span>
              등록한 내 사주 사용하기
              <span className="block text-xs text-[#6B6661] mt-0.5">
                {saved.birth_date}
                {saved.birth_time ? ` · ${saved.birth_time.slice(0, 5)}` : " · 시각 모름"}
                {" · "}{saved.gender === "M" ? "남성" : "여성"}
              </span>
            </span>
          </label>
        )}

        {saved && !confirmMode && (
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
              edited();
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
              edited();
            }}
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-white disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] tracking-widest"
          />
          <label
            onClick={() => { setNoTime(!noTime); setBirthTime(""); edited(); }}
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
                onClick={() => { setGender(val); edited(); }}
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
          {busy ? (busyLabel ?? "풀이 생성 중...") : (submitLabel ?? "이 사주로 풀이 보기")}
        </button>
      </div>
    </div>
  );
}
