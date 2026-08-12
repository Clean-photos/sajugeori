import type { SampleReport } from "@/lib/sample-reports";

/**
 * 대각선으로 안내 문구를 반복 타일링하는 워터마크. 순수 CSS 배경(SVG 데이터
 * URI)이라 이미지 파일이 따로 필요 없다. pointer-events-none이라 아래 텍스트를
 * 선택하거나 읽는 데는 지장이 없다. 항목 사이사이 "· · · 샘플 · · ·" 구분선
 * 대신, 이 워터마크 하나로 전체를 덮어 "이건 샘플이고 실제 결과가 아니다"를
 * 계속 상기시킨다.
 */
function WatermarkOverlay() {
  const lines = ["샘플 SAMPLE 결과입니다", "로그인 후 본인의 사주로 확인하세요", "사주거리"];
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='260'>` +
        lines
          .map(
            (line, i) =>
              `<text x='240' y='${70 + i * 34}' text-anchor='middle' font-size='16' font-family='sans-serif' font-weight='700' fill='#C8743A' opacity='0.16' transform='rotate(-24 240 130)'>${line}</text>`
          )
          .join("") +
        `</svg>`
    );
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-10"
      style={{ backgroundImage: `url("${svg}")`, backgroundRepeat: "repeat", backgroundPosition: "center" }}
    />
  );
}

/**
 * 게이트(비로그인·미결제) 화면에 보여주는 샘플 리포트 전문.
 * 대각선 워터마크로 방문자가 이걸 자기 사주 결과로 착각하지 않도록 한다.
 * 실제 결제 시에는 본인 사주로 새로 계산됨을 끝에 한 번 더 명시한다.
 */
export function SamplePreview({ sample }: { sample: SampleReport }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#C8743A]/40 bg-[#FBF8F2]">
      <WatermarkOverlay />

      <div className="relative px-4 pt-3 pb-1 flex items-center justify-between border-b border-dashed border-[#C8743A]/30">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8743A]/15 text-[#8A5228] tracking-wide">
          샘플 결과입니다
        </span>
        <span className="text-[10px] text-[#6B6661]">{sample.input}</span>
      </div>

      <div className="relative px-4 py-3 flex flex-col gap-1">
        {sample.kind === "sections" ? (
          sample.sections.map((sec) => (
            <div key={sec.id} className="py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span>{sec.icon}</span>
                <span className="text-sm font-semibold text-[#1F3D34]">{sec.label}</span>
              </div>
              <p className="text-base text-[#1A1A18]/85 leading-relaxed whitespace-pre-wrap">{sec.text}</p>
            </div>
          ))
        ) : (
          sample.text.split("\n\n").map((block, i) => (
            <p key={i} className="text-base text-[#1A1A18]/85 leading-relaxed whitespace-pre-wrap py-2">{block}</p>
          ))
        )}
      </div>

      <p className="relative text-center text-[10px] font-medium text-[#C8743A]/80 tracking-wide px-4 py-3 border-t border-dashed border-[#C8743A]/30">
        — 여기까지 샘플 결과입니다 · 실제 결과는 회원님의 사주로 다시 계산됩니다 —
      </p>
    </div>
  );
}
