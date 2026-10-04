"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// 페이지 단위 렌더링 오류 — 레이아웃은 유지한 채 이 영역만 안내로 대체한다.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-semibold text-[#1A1A18]">화면을 불러오지 못했어요</p>
      <p className="text-sm text-[#6B6661]">잠시 후 다시 시도해주세요. 문제가 계속되면 문의로 알려주세요.</p>
      <button onClick={reset} className="mt-2 rounded-xl bg-[#1F3D34] px-5 py-2.5 text-sm text-white">
        다시 시도
      </button>
    </div>
  );
}
