"use client";

// 오행 보완 결과 최상단 요약 카드 — 캡처해서 단톡방에 던지는 한 장 (CoS §C-2 ① 막대 그래프형).
// 검사 결과지 톤: 해석이 아니라 사실(일간·신강약·개수·비율·등급·처방 오행)만 싣는다.
// 넣지 않는 것: 생년월일·시각·가중치 소수점 같은 내부 수치.
// 세로 600px 이내(390px 폭 기준)로 스크롤 없이 한 화면에 들어가게 만든다.
import { useRef } from "react";
import type { WuxingReportData } from "@/lib/wuxing/report";
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";
import { TIER_STYLE } from "./ElementBars";
import { ResultCardActions } from "@/components/share/ResultCardActions";
import type { Element } from "@/lib/saju-engine/constants";

function ElementChips({ items, empty }: { items: { el: Element; kr: string }[]; empty: string }) {
  if (items.length === 0) return <span className="text-[12.5px] text-[#6B6661]">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map(({ el, kr }) => (
        <span key={el} className="inline-flex items-baseline gap-1 rounded-lg px-2 py-[2px] bg-white border border-[#E5DFD4]">
          <span className="w-[7px] h-[7px] rounded-full self-center" style={{ backgroundColor: ELEMENT_COLOR[el] }} aria-hidden />
          <span className="font-serif text-[14px] font-bold text-[#1A1A18]">{el}</span>
          <span className="text-[11px] text-[#6B6661]">{kr}</span>
        </span>
      ))}
    </span>
  );
}

export function WuxingSummaryCard({ data }: { data: WuxingReportData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { bars, yongsin } = data.map;

  const isFollow = yongsin.frame === "follow";
  const fill: { el: Element; kr: string }[] = [];
  if (yongsin.main && yongsin.mainKr) fill.push({ el: yongsin.main, kr: yongsin.mainKr });
  if (yongsin.helper && yongsin.helperKr) fill.push({ el: yongsin.helper, kr: yongsin.helperKr });
  const avoid = yongsin.avoid.map((el, i) => ({ el, kr: yongsin.avoidKr[i] }));

  return (
    <div className="flex flex-col gap-2.5">
      {/* 캡처 대상 — 여백까지 포함한 한 장 */}
      <div ref={cardRef} className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[#6B6661]">오행 보완 진단서</p>
        {data.card && (
          <p className="mt-1 font-serif text-[22px] font-bold leading-tight text-[#1F3D34]">
            {data.card.dayMaster} <span className="text-[#6B6661]">·</span> {data.card.strength}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {bars.map((b) => {
            const style = TIER_STYLE[b.tier];
            return (
              <div key={b.element} className="flex items-center gap-2">
                <div className="w-11 flex-shrink-0 flex items-baseline gap-1">
                  <span className="font-serif text-[15px] font-bold text-[#1A1A18]">{b.element}</span>
                  <span className="text-[10.5px] text-[#6B6661]">{b.elementKr}</span>
                </div>
                <div className="flex-1 h-[16px] rounded-[4px] bg-[#EFEAE0] overflow-hidden">
                  {b.count > 0 && (
                    <div className="h-full rounded-[4px]" style={{ width: `${Math.max(b.ratio * 100, 4)}%`, backgroundColor: ELEMENT_COLOR[b.element] }} />
                  )}
                </div>
                {/* 2026-09-22(CoS 실물 재검증): 퍼센트는 합계를 100%로 맞추려 반올림 오차를
                    나눠 갖는 최대잔여법을 쓴다(1/8=12.5%가 12%·13%로 갈릴 수 있음) — 캡처해
                    돌아다니는 카드에서 "같은 1개인데 왜 %가 다르냐"는 혼란을 낳았다. 카드는
                    개수만 보여주고 퍼센트는 뺀다(전체 리포트에는 그대로 남아 있다). */}
                <div className="w-[40px] flex-shrink-0 text-right">
                  <span className="text-[12px] font-semibold text-[#1A1A18] tabular-nums">{b.count}개</span>
                </div>
                <span
                  className="w-[50px] flex-shrink-0 text-center text-[10px] font-semibold rounded-full py-[2px]"
                  style={{ backgroundColor: style.bg, color: style.fg }}
                >
                  {b.tierLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3.5 pt-3 border-t border-[#E5DFD4] flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-[92px] flex-shrink-0 text-[12px] font-bold text-[#1F3D34]">{isFollow ? "따라야 할 기운" : "채워야 할 기운"}</span>
            <ElementChips items={fill} empty="해당 없음" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-[92px] flex-shrink-0 text-[12px] font-bold text-[#1F3D34]">피해야 할 기운</span>
            <ElementChips items={avoid} empty="해당 없음" />
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-[10.5px] text-[#6B6661]">
          <span>근거 강도 B · 오락·참고용</span>
          <span className="font-semibold tracking-wide text-[#1F3D34]">사주거리 · sajugeori.com</span>
        </div>
      </div>

      <ResultCardActions
        targetRef={cardRef}
        itemId="wuxing"
        campaign="ohang"
        landingPath="/free/saju"
        shareTitle="내 오행 진단서 · 사주거리"
        shareText="내 오행 분포를 검사해 봤어요."
      />
    </div>
  );
}
