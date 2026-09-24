"use client";

// 무료 사주 결과 상단 요약 카드 — 명식 8글자·오행 분포·신살 목록 (§B-6, CoS 2026-09-23).
// 전부 순수 계산값(용신·처방 아님)이라 무료로 공개해도 프리미엄과 경계를 해치지 않는다.
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";
import type { FreeSajuCard as FreeSajuCardData } from "@/lib/free/free-saju-card";

// 신살 목록은 길면 카드가 늘어져 캡처하기 부담스럽다 — 상위 몇 개만 보여준다.
const MAX_SAL = 6;

export function FreeSajuCard({ card }: { card: FreeSajuCardData }) {
  const maxCount = Math.max(1, ...card.elements.map((e) => e.count));

  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      {/* 명식 8글자 */}
      <div>
        <p className="text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">
          명식 {card.pillars.length === 4 ? "8글자" : `${card.pillars.length * 2}글자`}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {card.pillars.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1 bg-white border border-[#E5DFD4] rounded-xl py-2.5">
              <span className="text-[10px] text-[#6B6661]">{p.label}</span>
              <span className="font-serif text-[17px] font-bold text-[#1A1A18] leading-tight">{p.stem}</span>
              <span className="font-serif text-[17px] font-bold text-[#1A1A18] leading-tight">{p.branch}</span>
              <span className="text-[10px] text-[#6B6661]">{p.stemKr}{p.branchKr}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 오행 분포 — 등급·처방 없이 개수만(프리미엄 오행 보완과 경계 유지) */}
      <div>
        <p className="text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">오행 분포</p>
        <div className="flex flex-col gap-1.5">
          {card.elements.map((e) => (
            <div key={e.element} className="flex items-center gap-2.5">
              <div className="w-9 flex-shrink-0 flex items-baseline gap-1">
                <span className="font-serif text-[14px] font-bold text-[#1A1A18]">{e.element}</span>
                <span className="text-[10px] text-[#6B6661]">{e.elementKr}</span>
              </div>
              <div className="flex-1 h-[14px] rounded-[4px] bg-[#EFEAE0] overflow-hidden">
                {e.count > 0 && (
                  <div
                    className="h-full rounded-[4px]"
                    style={{ width: `${Math.max((e.count / maxCount) * 100, 8)}%`, backgroundColor: ELEMENT_COLOR[e.element] }}
                  />
                )}
              </div>
              <span className="w-[28px] flex-shrink-0 text-right text-[11px] font-semibold text-[#1A1A18] tabular-nums">{e.count}개</span>
            </div>
          ))}
        </div>
      </div>

      {/* 신살 목록 — 이름·위치만(설명·길흉 판정은 프리미엄 살풀이 영역) */}
      {card.sal.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">신살</p>
          <div className="flex flex-wrap gap-1.5">
            {card.sal.slice(0, MAX_SAL).map((s, i) => (
              <span key={`${s.name}-${s.where}-${i}`} className="text-[11px] font-medium text-[#1F3D34] bg-[#1F3D34]/8 rounded-full px-2.5 py-1">
                {s.name} <span className="text-[#6B6661]">· {s.where}</span>
              </span>
            ))}
            {card.sal.length > MAX_SAL && (
              <span className="text-[11px] text-[#6B6661] px-1 py-1">외 {card.sal.length - MAX_SAL}개</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
