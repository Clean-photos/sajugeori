"use client";

import { useState } from "react";
import type { SampleReport } from "@/lib/sample-reports";
import { cleanReportText } from "@/lib/report-format";
import { ReportBody } from "./ReportBody";

/**
 * 대각선으로 안내 문구를 반복 타일링하는 워터마크. 순수 CSS 배경(SVG 데이터
 * URI)이라 이미지 파일이 따로 필요 없다. pointer-events-none이라 아래 텍스트를
 * 선택하거나 읽는 데는 지장이 없다. 항목 사이사이 "· · · 샘플 · · ·" 구분선
 * 대신, 이 워터마크 하나로 전체를 덮어 "이건 샘플이고 실제 결과가 아니다"를
 * 계속 상기시킨다.
 */
function WatermarkOverlay({ loggedIn }: { loggedIn: boolean }) {
  // §4(CEO 결정 2026-09-02): 로그인 상태에서도 "로그인 후"라고 뜨는 건 이미
  // 로그인한 사람 눈엔 모순이다 — 로그인 여부에 따라 가운데 줄만 바꾼다.
  const middleLine = loggedIn ? "결제 후 본인의 사주로 확인하세요" : "로그인 후 본인의 사주로 확인하세요";
  const lines = ["샘플 SAMPLE 결과입니다", middleLine, "사주거리"];
  // 가독성 개선: 타일을 더 크게(480→560×260→320) 잡고 불투명도를 낮춰(0.16→0.11)
  // 실제 리포트 본문 위에 겹쳐도 글자가 덜 부딪히게 한다 — 워터마크 기능(샘플임을
  // 계속 상기)은 유지하되 밀도만 낮추는 방향.
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'>` +
        lines
          .map(
            (line, i) =>
              `<text x='280' y='${90 + i * 40}' text-anchor='middle' font-size='16' font-family='sans-serif' font-weight='700' fill='#C8743A' opacity='0.11' transform='rotate(-24 280 160)'>${line}</text>`
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

// §2(2/3 문서, CEO 결정 2026-09-03): 샘플 8개 영역이 4,368px 통짜로 펼쳐져
// 품질 증명이 오히려 구매를 막고 있었다. "접는 것과 감추는 것은 다르다 —
// 전문 공개 정책은 유지한다"는 지시에 따라, 텍스트는 항상 DOM에 그대로
// 있고(SEO 색인·전문 공개 그대로) 화면 표시만 CSS로 접는다. 기본 2개만
// 펼치고 나머지는 접어 첫 화면 길이를 압축한다.
const DEFAULT_OPEN_COUNT = 2;

function AccordionSection({
  icon, label, text, defaultOpen,
}: { icon: string; label: string; text: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-2 border-b border-[#E5DFD4] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-[#1F3D34]">{label}</span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {open && <span className="text-[10px] font-medium text-[#8A5228]">펼침</span>}
          <span
            className={`text-[#8A5228] text-xs transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            ▶
          </span>
        </span>
      </button>
      {/* hidden(=display:none)일 뿐 DOM에서 제거하지 않는다 — 접힌 섹션도
          텍스트는 그대로 렌더돼 있어야 "전문 공개"가 유지된다. */}
      <div className={open ? "mt-1.5" : "hidden"}>
        <ReportBody text={text} />
      </div>
    </div>
  );
}

/**
 * 게이트(비로그인·미결제) 화면에 보여주는 샘플 리포트 전문.
 * 대각선 워터마크로 방문자가 이걸 자기 사주 결과로 착각하지 않도록 한다.
 * 실제 결제 시에는 본인 사주로 새로 계산됨을 끝에 한 번 더 명시한다.
 */
export function SamplePreview({ sample, loggedIn = false }: { sample: SampleReport; loggedIn?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#C8743A]/40 bg-[#FBF8F2]">
      <WatermarkOverlay loggedIn={loggedIn} />

      <div className="relative px-4 pt-3 pb-1 flex items-center justify-between border-b border-dashed border-[#C8743A]/30">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8743A]/15 text-[#8A5228] tracking-wide">
          샘플 결과입니다
        </span>
        <span className="text-[10px] text-[#6B6661]">{sample.input}</span>
      </div>

      {/* 실제 결제 후 보게 될 리포트와 같은 렌더러(ReportBody)를 쓴다 —
          샘플에서 본 것과 실제 결과의 생김새가 달라 보이면 안 된다. */}
      <div className="relative px-4 py-3 flex flex-col gap-1">
        {sample.kind === "sections" ? (
          sample.sections.map((sec, i) => (
            <AccordionSection
              key={sec.id}
              icon={sec.icon}
              label={sec.label}
              text={cleanReportText(sec.text)}
              defaultOpen={i < DEFAULT_OPEN_COUNT}
            />
          ))
        ) : (
          <div className="py-2">
            <ReportBody text={cleanReportText(sample.text)} />
          </div>
        )}
      </div>

      <p className="relative text-center text-[10px] font-medium text-[#C8743A]/80 tracking-wide px-4 py-3 border-t border-dashed border-[#C8743A]/30">
        — 여기까지 샘플 결과입니다 · 실제 결과는 회원님의 사주로 다시 계산됩니다 —
      </p>
    </div>
  );
}
