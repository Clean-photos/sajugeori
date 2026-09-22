"use client";

// 프리미엄 살풀이 결과 최상단 요약 카드 — 명식 배치도형 (CoS §C-2 ②).
// 네 기둥(연·월·일·시)에 어떤 살이 어느 자리에 앉았는지를 한 장에 보여주고, 맨 아래에 "그래서 무슨
// 기운이 두드러지는 사주인지"를 한 줄로 결론 낸다.
//
// 2026-09-22(CEO 실물 확인): 처음 버전은 "월지 중첩·일지 중첩"이라는 자리 용어와 "용신 후보"(억부·조후
// 병기) 블록을 그대로 실었는데, "그래서 좋다는 거야 뭐야?", "용신 후보는 왜 있는지 모르겠다"는 반응이
// 나왔다 — 둘 다 명리 용어를 그대로 노출한 것이 원인이라 보고 뺐다. 자리 중첩은 카드 안에서 이미 테두리
// 색과 ▲ 표시로 강조되고 있어 별도 문구가 없어도 시각적으로 전달된다. 용신 후보는 이 카드의 주제(검출된
// 살)와 다른 축이라 오히려 "그래서 결론이 뭔데"를 흐렸다.
//
// 생년월일·시각은 넣지 않는다. 세로 600px 이내(390px 폭 기준).
import { useRef } from "react";
import type { SalpuriCardData } from "@/lib/premium/salpuri-card";
import { ResultCardActions } from "@/components/share/ResultCardActions";

export function SalpuriSummaryCard({ card }: { card: SalpuriCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const overlapPositions = new Set(card.overlaps.map((o) => o.position));

  return (
    <div className="flex flex-col gap-2.5">
      {/* 캡처 대상 */}
      <div ref={cardRef} className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[#6B6661]">살풀이 검출표</p>
        <p className="mt-1 font-serif text-[22px] font-bold leading-tight text-[#1F3D34]">검출된 살 {card.count}종</p>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {card.pillars.map((pl, i) => {
            const marks = card.marks[i];
            const overlapped = overlapPositions.has(`${pl.label}지`);
            const unknown = pl.stem === null;
            return (
              <div
                key={pl.label}
                className="rounded-xl px-1 pt-2 pb-2 flex flex-col items-center bg-white"
                style={{ border: `1px solid ${overlapped ? "#C8743A" : "#E5DFD4"}` }}
              >
                <span className="text-[10.5px] text-[#6B6661]">{pl.label}주</span>
                {unknown ? (
                  <span className="my-3 text-[11px] text-[#6B6661]">시각 모름</span>
                ) : (
                  <>
                    <span className="mt-0.5 font-serif text-[24px] font-bold leading-none text-[#1A1A18]">{pl.stem}</span>
                    <span className="text-[10px] text-[#6B6661] mb-1">{pl.stemKr}</span>
                    <span className="font-serif text-[24px] font-bold leading-none text-[#1A1A18]">{pl.branch}</span>
                    <span className="text-[10px] text-[#6B6661]">{pl.branchKr}</span>
                  </>
                )}
                <div className="mt-1.5 flex flex-col items-center gap-1 w-full">
                  {marks.length > 0 && <span className="text-[9px] leading-none text-[#C8743A]" aria-hidden>▲</span>}
                  {marks.map((m) => (
                    <span
                      key={m}
                      className="w-full text-center text-[10px] font-semibold leading-none rounded-full py-[3px]"
                      style={{ backgroundColor: "#FDF0E3", color: "#8A5228" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

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
        itemId="salpuri"
        campaign="salpuri"
        landingPath="/free/saju"
        shareTitle="내 살풀이 검출표 · 사주거리"
        shareText="내 사주에서 어떤 살이 어느 자리에 있는지 검사해 봤어요."
      />
    </div>
  );
}
