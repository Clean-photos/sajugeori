"use client";

import { SITE_URL } from "@/lib/site";

/**
 * 인쇄 결과 맨 아래 서비스 URL. 화면에서는 숨겨져 있다가(.print-footer)
 * 인쇄할 때만 보인다(globals.css @media print) — 출력물을 통한 재유입 장치.
 */
export function PrintReportFooter() {
  return (
    <p className="print-footer text-[10px] text-[#6B6661] text-center mt-4 pt-3 border-t border-[#E5DFD4]">
      {SITE_URL.replace(/^https?:\/\//, "")}에서 만든 리포트입니다
    </p>
  );
}

/** 브라우저 인쇄(다른 이름으로 저장 → PDF)로 다운로드를 대신한다. 서버 부하가 없다. */
export function PrintButton({ label = "인쇄 · 저장하기" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print w-full border border-[#E5DFD4] text-[#1F3D34] rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all"
    >
      {label}
    </button>
  );
}
