"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

function FailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const message = params.get("message") ?? "결제가 취소되었거나 실패했습니다.";

  // §(CoS 실물 확인, 2026-09-28): 결제 페이지까지 갔다 안 한 세션이 26건
  // 나왔는데 여기서 이벤트를 하나도 안 남겨 어디서 끊기는지 전혀 안 보였다.
  // 토스가 failUrl로 리턴할 때 붙여 주는 code/message/orderId를 그대로
  // 읽어 남긴다 — code가 취소성이면 payment_canceled, 아니면 payment_failed
  // (BuyClient.tsx의 위젯-닫기 판정과 같은 기준).
  useEffect(() => {
    const code = params.get("code") ?? "";
    const orderId = params.get("orderId") ?? "";
    const planId = params.get("planId") ?? "";
    const canceled = /cancel|CANCELED/i.test(code) || /cancel|닫|취소/i.test(message);
    trackEvent(canceled ? "payment_canceled" : "payment_failed", {
      item_id: planId, reason: message, code, transaction_id: orderId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="text-5xl">😢</div>
      <h1 className="font-serif text-lg font-bold text-[#1F3D34]">결제가 완료되지 않았어요</h1>
      <p className="text-sm text-[#6B6661]">{message}</p>
      <button
        onClick={() => router.push("/premium/menu")}
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
