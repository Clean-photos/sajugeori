"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const message = params.get("message") ?? "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="text-5xl">😢</div>
      <h1 className="font-serif text-lg font-bold text-[#1F3D34]">결제가 완료되지 않았어요</h1>
      <p className="text-sm text-[#6B6661]">{message}</p>
      <button
        onClick={() => router.push("/premium/subscribe")}
        className="mt-2 bg-[#C8743A] text-white rounded-xl px-6 py-3 text-sm font-semibold"
      >
        다시 시도
      </button>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={null}>
      <FailInner />
    </Suspense>
  );
}
