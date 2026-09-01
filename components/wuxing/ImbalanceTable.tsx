// 불균형 진단표 (§2-② 오행 지도) — 과다 / 다소 많음 / 적정 / 부족 / 부재.
//
// 분포 막대가 "얼마나"라면 이 표는 "그래서 어느 쪽으로 기울었나"를 한눈에 준다.
// 해당 오행이 없는 등급은 buildImbalanceRows가 아예 행을 만들지 않으므로,
// 여기서는 빈 행 처리를 신경 쓰지 않는다.
import type { ImbalanceRow } from "@/lib/wuxing/map-section";
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";

const ROW_ACCENT: Record<string, string> = {
  excessive: "#B3261E",
  mildlyMany: "#8A5228",
  normal: "#41614B",
  scarce: "#8A5228",
  absent: "#B3261E",
};

export function ImbalanceTable({ rows, hourUnknown }: { rows: ImbalanceRow[]; hourUnknown: boolean }) {
  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <h3 className="text-sm font-bold text-[#1F3D34] mb-3">불균형 진단</h3>

      <div className="flex flex-col divide-y divide-[#E5DFD4]">
        {rows.map((row) => (
          <div key={row.tier} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              className="w-[62px] flex-shrink-0 text-[12px] font-bold"
              style={{ color: ROW_ACCENT[row.tier] }}
            >
              {row.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {row.elements.map((el, i) => (
                <span
                  key={el}
                  className="inline-flex items-baseline gap-1 rounded-lg px-2 py-[3px] bg-[#F6F1E7] border border-[#E5DFD4]"
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full self-center"
                    style={{ backgroundColor: ELEMENT_COLOR[el] }}
                    aria-hidden
                  />
                  <span className="font-serif text-[13px] font-bold text-[#1A1A18]">{el}</span>
                  <span className="text-[11px] text-[#6B6661]">{row.elementsKr[i]}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 결정 ② — 시간 미상이면 판정 정밀도가 떨어진다는 고지. 정직하면서 시주 입력 유인도 된다 */}
      {hourUnknown && (
        <p className="mt-3 text-[11px] leading-relaxed text-[#6B6661] bg-[#F6F1E7] border border-[#E5DFD4] rounded-xl px-3 py-2">
          출생 시간을 모르시면 여덟 글자 중 두 글자가 비어 판정 정밀도가 떨어집니다. 시간을 아시면 더 정확한 결과를 받아보실 수 있습니다.
        </p>
      )}
    </div>
  );
}
