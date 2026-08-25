"use client";

import { useEffect, useState } from "react";

/**
 * 리포트 저장 수단 모음.
 *
 * 기존에는 "인쇄 · 저장하기" 버튼 하나뿐이라 눌러도 인쇄 다이얼로그만 떴다.
 * 모바일에서 PDF로 저장하려면 다이얼로그에서 몇 단계를 더 거쳐야 해서 불편하다.
 * 실제로 많이 쓰는 순서대로 배치한다 — 복사 / 공유(모바일) / PDF.
 */
export function SaveReportButtons({ text, title = "사주거리 리포트" }: { text: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // navigator.share는 모바일(및 일부 데스크톱)에만 있다. SSR/하이드레이션
  // 불일치를 피하려고 마운트 후에 판정한다.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 환경(구형 브라우저·비보안 컨텍스트) 폴백
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
      ta.remove();
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text });
    } catch {
      /* 사용자가 취소한 경우 포함 — 별도 처리 없음 */
    }
  }

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 border border-[#E5DFD4] bg-[#FBF8F2] text-[#1F3D34] rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all"
        >
          {copied ? "복사됐어요" : "텍스트 복사"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="flex-1 border border-[#E5DFD4] bg-[#FBF8F2] text-[#1F3D34] rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all"
          >
            공유하기
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="w-full border border-[#E5DFD4] text-[#6B6661] rounded-xl py-3 text-sm font-medium active:scale-[0.97] transition-all"
      >
        PDF로 저장 · 인쇄
      </button>
      <p className="text-[11px] text-[#6B6661]/70 text-center leading-relaxed">
        복사한 내용은 메모장이나 카카오톡에 붙여넣어 보관할 수 있어요.
      </p>
    </div>
  );
}
