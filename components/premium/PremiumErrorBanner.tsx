"use client";

import Link from "next/link";
import type { PremiumErrorInfo } from "./premiumError";

/** premiumErrorInfo()의 결과를 렌더하는 공용 배너. 행동 버튼이 있으면 함께 보여준다. */
export function PremiumErrorBanner({ error }: { error: PremiumErrorInfo }) {
  return (
    <div className="text-xs text-[#C0392B] bg-[#C0392B]/8 border border-[#C0392B]/25 rounded-xl px-3.5 py-3 leading-relaxed flex flex-col gap-1.5">
      <p>{error.message}</p>
      {error.actionHref && (
        <Link href={error.actionHref} className="font-semibold underline underline-offset-2 w-fit">
          {error.actionLabel ?? "이동하기"} →
        </Link>
      )}
    </div>
  );
}
