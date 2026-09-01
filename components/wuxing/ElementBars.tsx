// 오행 분포 막대 (§2-① 오행 지도).
//
// 색은 원형도(OhaengCircleDiagram)와 같은 ELEMENT_COLOR를 쓴다 — 같은 섹션 안에서
// 두 도표가 다른 색 체계를 쓰면 독자가 색↔오행 매핑을 두 번 배워야 한다.
// 색은 보조 채널이고, 식별은 한자·한글 라벨과 개수·등급 직접 라벨이 담당한다
// (팔레트 검증에서 노랑(토)이 밝은 배경 대비 3:1 미만이라 "직접 라벨 또는 표 병기"가
// 요구되는데, 이 컴포넌트는 그 둘을 이미 상시 노출한다).
import type { ElementBar } from "@/lib/wuxing/map-section";
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";

const TIER_STYLE: Record<string, { bg: string; fg: string }> = {
  absent: { bg: "#FBE9E7", fg: "#B3261E" },
  scarce: { bg: "#FDF0E3", fg: "#8A5228" },
  normal: { bg: "#EDF1EC", fg: "#41614B" },
  mildlyMany: { bg: "#FDF0E3", fg: "#8A5228" },
  excessive: { bg: "#FBE9E7", fg: "#B3261E" },
};

export function ElementBars({ bars, charCount }: { bars: ElementBar[]; charCount: number }) {
  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1F3D34]">오행 분포</h3>
        <span className="text-[11px] text-[#6B6661]">여덟 글자 기준 · 총 {charCount}글자</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {bars.map((b) => {
          const style = TIER_STYLE[b.tier];
          return (
            <div key={b.element} className="flex items-center gap-2.5">
              {/* 라벨 — 색이 아니라 이 글자가 1차 식별 수단 */}
              <div className="w-12 flex-shrink-0 flex items-baseline gap-1">
                <span className="font-serif text-[15px] font-bold text-[#1A1A18]">{b.element}</span>
                <span className="text-[11px] text-[#6B6661]">{b.elementKr}</span>
              </div>

              {/* 막대 — 트랙을 항상 그려 0개일 때도 행이 비어 보이지 않게 한다 */}
              <div className="flex-1 h-[18px] rounded-[4px] bg-[#EFEAE0] overflow-hidden">
                {b.count > 0 && (
                  <div
                    className="h-full rounded-[4px]"
                    style={{ width: `${Math.max(b.ratio * 100, 4)}%`, backgroundColor: ELEMENT_COLOR[b.element] }}
                  />
                )}
              </div>

              {/* 직접 라벨 — 개수·백분율을 항상 노출(색 대비 보정 채널) */}
              <div className="w-[68px] flex-shrink-0 text-right">
                <span className="text-[12px] font-semibold text-[#1A1A18] tabular-nums">{b.count}개</span>
                <span className="text-[11px] text-[#6B6661] tabular-nums ml-1">{b.percent}%</span>
              </div>

              {/* 등급 배지 — 과다/부족을 색 없이도 읽을 수 있게 글자로 */}
              <span
                className="w-[52px] flex-shrink-0 text-center text-[10.5px] font-semibold rounded-full py-[3px]"
                style={{ backgroundColor: style.bg, color: style.fg }}
              >
                {b.tierLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
