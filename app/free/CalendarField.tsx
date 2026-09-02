"use client";

import { toSolar, type CalendarKind } from "@/lib/calendar/convert";

/**
 * 무료 4종 입력 폼이 공유하는 역법 선택 + 변환 표시 조각.
 *
 * 무료 폼은 각자 따로 쓰여 있어 공용 컴포넌트가 없었다. 같은 UI를 네 벌 복붙하면
 * 나중에 문구 하나 고칠 때 한 곳을 빠뜨리게 되므로 이 조각만 떼어 공유한다.
 * (유료 8종은 SajuInputForm을 이미 공유하므로 그쪽에 직접 붙였다.)
 *
 * 상태는 부모가 들고, 여기서는 그리기만 한다 — 부모가 제출 직전에 같은
 * toSolar()로 변환해 양력을 서버에 보낸다.
 */
export function CalendarField({
  birthDate,
  calendar,
  onChange,
}: {
  birthDate: string;
  calendar: CalendarKind;
  onChange: (kind: CalendarKind) => void;
}) {
  const conv = birthDate.length === 10 ? toSolar(birthDate, calendar) : null;

  return (
    <div className="mt-2">
      <div className="grid grid-cols-3 gap-1.5">
        {([
          ["solar", "양력"],
          ["lunar", "음력(평달)"],
          ["lunar-leap", "음력(윤달)"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
              calendar === val
                ? "bg-[#1F3D34] text-white border-[#1F3D34]"
                : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 변환 결과 즉시 표시 — 사용자가 "제대로 넣었나"를 스스로 확인할 수 있어야 한다. */}
      {conv && !conv.ok && (
        <p className="mt-2 text-[11.5px] text-[#C0392B] leading-relaxed">{conv.error}</p>
      )}
      {conv?.ok && (
        <p className="mt-2 text-[11.5px] text-[#41614B] leading-relaxed">
          {calendar === "solar"
            ? `음력으로는 ${conv.lunar}${conv.isLeap ? " (윤달)" : ""}입니다`
            : `양력으로는 ${conv.solar}입니다 · 이 날짜로 계산합니다`}
        </p>
      )}
    </div>
  );
}
