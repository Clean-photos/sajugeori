import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "./BlueprintReportView";

/**
 * 대각선으로 "SAMPLE 샘플"을 반복 타일링하는 워터마크.
 * components/premium/SamplePreview.tsx의 것과 동일한 방식.
 */
function WatermarkOverlay() {
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='140'>` +
        `<text x='-10' y='80' font-size='22' font-family='sans-serif' font-weight='700' fill='#C8743A' opacity='0.16' transform='rotate(-24 130 70)'>SAMPLE 샘플</text>` +
        `</svg>`
    );
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-10"
      style={{ backgroundImage: `url("${svg}")`, backgroundRepeat: "repeat" }}
    />
  );
}

/**
 * 운명 설계도 게이트 화면 전용 샘플 — 24문항 전체가 다 보이는 실제 생성 결과.
 * 7,900원짜리 상품이 뭘 주는지 방문자가 곧바로 가늠할 수 있도록, 항목별
 * 발췌가 아니라 실제 완성본 전체(components/blueprint/BlueprintReportView와
 * 동일한 렌더)를 워터마크로 덮어서 보여준다.
 */
export function DestinySamplePreview({ report, input }: { report: BlueprintReport; input: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#C8743A]/40 bg-[#FBF8F2]">
      <WatermarkOverlay />

      <div className="relative px-4 pt-3 pb-1 flex items-center justify-between border-b border-dashed border-[#C8743A]/30">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8743A]/15 text-[#8A5228] tracking-wide">
          샘플 결과입니다 · 전체 24문항
        </span>
        <span className="text-[10px] text-[#6B6661]">{input}</span>
      </div>

      <div className="relative">
        <BlueprintReportView report={report} showPrintButton={false} />
      </div>

      <p className="relative text-center text-[10px] font-medium text-[#C8743A]/80 tracking-wide px-4 py-3 border-t border-dashed border-[#C8743A]/30">
        — 여기까지 샘플 결과입니다 · 실제 결과는 회원님의 사주로 다시 계산됩니다 —
      </p>
    </div>
  );
}
