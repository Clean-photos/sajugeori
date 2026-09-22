"use client";

// 프리미엄 택일 결과 최상단 요약 카드 — 달력형 (CoS §C-2 ⑤).
// 날짜·간지·별점만 나열하지 않고, 1위 날짜가 "왜" 좋은 날인지 한 줄 결론을 맨 아래에 낸다
// (2026-09-22 살풀이 카드와 같은 원칙 — 엔진이 이미 쓴 합/충 근거 문장을 재사용, 새 주장 없음).
// 연도는 담지 않는다(카드는 단톡방에 그대로 공유된다). 세로 600px 이내(390px 폭 기준).
import { useRef } from "react";
import type { TaekilCardData } from "@/lib/premium/taekil-card";
import { ResultCardActions } from "@/components/share/ResultCardActions";

const MEDALS = ["🥇", "🥈", "🥉"];

export function TaekilSummaryCard({ card }: { card: TaekilCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  if (card.top.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div ref={cardRef} className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[#6B6661]">택일 진단서 · {card.purposeLabel}</p>
        <p className="mt-1 font-serif text-[20px] font-bold leading-tight text-[#1F3D34]">좋은 날 TOP {card.top.length}</p>

        <div className="mt-3 flex flex-col gap-1.5">
          {card.top.map((d, i) => (
            <div key={d.mmdd} className="flex items-center gap-2.5 rounded-xl border border-[#E5DFD4] bg-white px-3 py-2">
              <span className="text-[17px] leading-none">{MEDALS[i]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold text-[#1A1A18] leading-tight">
                  {d.mmdd} <span className="font-normal text-[11px] text-[#6B6661]">({d.weekday}) {d.ganji}</span>
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-semibold rounded-full px-2 py-[2px]" style={{ backgroundColor: "#FDF0E3", color: "#8A5228" }}>
                {d.tag}
              </span>
              <span className="flex-shrink-0 text-[11px] tracking-tight" style={{ color: "#C8743A" }} aria-label={`별점 ${d.stars}/5`}>
                {"★".repeat(d.stars)}
                <span className="text-[#E5DFD4]">{"★".repeat(5 - d.stars)}</span>
              </span>
            </div>
          ))}
        </div>

        {card.avoid.length > 0 && (
          <p className="mt-2 text-[11px] text-[#6B6661]">
            <span className="font-semibold" style={{ color: "#B3261E" }}>✕ 피할 날</span> {card.avoid.join(" · ")}
          </p>
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
        itemId="taekil"
        campaign="taekil"
        landingPath="/free/taekil"
        shareTitle="내 택일 진단서 · 사주거리"
        shareText="이 기간에서 가장 좋은 날을 계산해 봤어요."
      />
    </div>
  );
}
