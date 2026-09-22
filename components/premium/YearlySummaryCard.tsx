"use client";

// 프리미엄 연운세 결과 최상단 요약 카드 — 12개월 흐름선형 (CoS §C-2 ⑥).
// 12개월 막대만 보여주지 않고, 가장 좋은 달이 "왜" 좋은지 한 줄 결론을 맨 아래에 낸다
// (2026-09-22 살풀이 카드와 같은 원칙 — 엔진이 이미 쓴 합/충 근거 문장을 재사용, 새 주장 없음).
// 절대 점수는 노출하지 않는다(막대 높이로만 상대 비교). 세로 600px 이내(390px 폭 기준).
import { useRef } from "react";
import type { YearlyCardData, MonthTier } from "@/lib/premium/yearly-card";
import { ResultCardActions } from "@/components/share/ResultCardActions";

const TIER_COLOR: Record<MonthTier, string> = {
  good: "#41614B",
  neutral: "#D9CFC0",
  caution: "#B3261E",
};

export function YearlySummaryCard({ card }: { card: YearlyCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-2.5">
      <div ref={cardRef} className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[#6B6661]">연운세 진단서</p>
        <p className="mt-1 font-serif text-[20px] font-bold leading-tight text-[#1F3D34]">
          {card.year}년 {card.yearGanji}
        </p>

        <div className="mt-4 flex items-end gap-[3px] h-[56px]">
          {card.months.map((m) => (
            <div key={m.month} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${10 + m.ratio * 38}px`, backgroundColor: TIER_COLOR[m.tier] }}
                aria-hidden
              />
              <span className="text-[9px] text-[#6B6661] tabular-nums">{m.month}</span>
            </div>
          ))}
        </div>

        {(card.goodMonthsLabel || card.cautionMonthsLabel) && (
          <div className="mt-3 flex flex-col gap-1 text-[12px] text-[#1A1A18]">
            {card.goodMonthsLabel && (
              <p>
                <span className="font-semibold" style={{ color: "#41614B" }}>🔥 좋은 달</span> {card.goodMonthsLabel}
              </p>
            )}
            {card.cautionMonthsLabel && (
              <p>
                <span className="font-semibold" style={{ color: "#B3261E" }}>⚠ 조심할 달</span> {card.cautionMonthsLabel}
              </p>
            )}
          </div>
        )}

        {card.verdict && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold leading-relaxed" style={{ backgroundColor: "#FDF0E3", border: "1px solid #E9D9C4", color: "#8A5228" }}>
            {card.verdict}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[10.5px] text-[#6B6661]">
          <span>오락·참고용</span>
          <span className="font-semibold tracking-wide text-[#1F3D34]">사주거리 · sajugeori.com</span>
        </div>
      </div>

      <ResultCardActions
        targetRef={cardRef}
        itemId="yearly"
        campaign="yearly"
        landingPath="/free/yearly"
        shareTitle="내 연운세 진단서 · 사주거리"
        shareText="올 한 해 흐름을 계산해 봤어요."
      />
    </div>
  );
}
