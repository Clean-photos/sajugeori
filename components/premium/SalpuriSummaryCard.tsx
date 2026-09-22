"use client";

// 프리미엄 살풀이 결과 최상단 요약 카드 — 명식 배치도형 (CoS §C-2 ②).
// 네 기둥(연·월·일·시)에 어떤 살이 어느 자리에 앉았는지, 한 자리에 겹쳤는지를 한 장에 보여준다.
// 해석이 아니라 사실만: 자리·이름·겹침·용신 후보(억부·조후 병기, 단일 용신으로 단정하지 않음).
// 생년월일·시각은 넣지 않는다. 세로 600px 이내(390px 폭 기준).
import { useRef } from "react";
import type { SalpuriCardData, SalpuriCardElement } from "@/lib/premium/salpuri-card";
import { ResultCardActions } from "@/components/share/ResultCardActions";

function Els({ items }: { items: SalpuriCardElement[] }) {
  if (items.length === 0) return <span className="text-[#6B6661]">해당 없음</span>;
  return (
    <span className="font-serif font-bold text-[#1A1A18]">
      {items.map((e) => `${e.el}(${e.kr})`).join(" · ")}
    </span>
  );
}

export function SalpuriSummaryCard({ card }: { card: SalpuriCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const overlapPositions = new Set(card.overlaps.map((o) => o.position));
  // 같은 조합이 여러 자리에 겹치면 한 줄로 묶는다: "월지·일지 중첩 — 역마 + 고신"
  const merged = new Map<string, { positions: string[]; names: string[] }>();
  for (const o of card.overlaps) {
    const key = o.names.join("+");
    const cur = merged.get(key);
    if (cur) cur.positions.push(o.position);
    else merged.set(key, { positions: [o.position], names: o.names });
  }
  const shownOverlaps = [...merged.values()].slice(0, 3);

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

        {shownOverlaps.length > 0 && (
          <div className="mt-3 rounded-xl px-3 py-2 text-[12px] leading-relaxed" style={{ backgroundColor: "#FDF0E3", border: "1px solid #E9D9C4", color: "#8A5228" }}>
            {shownOverlaps.map((o) => (
              <p key={o.positions.join("·")}>
                <b>{o.positions.join("·")} 중첩</b> — {o.names.join(" + ")}
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#E5DFD4] flex flex-col gap-1 text-[12px] text-[#1F3D34]">
          <p className="font-bold">용신 후보 <span className="font-normal text-[10.5px] text-[#6B6661]">두 관점 병기 · 단정 아님</span></p>
          <p>억부 <Els items={card.yongsin.eokbu} /></p>
          <p>조후 <Els items={card.yongsin.johu} /></p>
          {card.yongsin.hourUnknown && <p className="text-[10.5px] text-[#6B6661]">태어난 시각을 몰라 시주는 제외한 결과입니다</p>}
        </div>

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
