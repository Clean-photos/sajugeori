"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"confirming" | "done" | "error">("confirming");
  const [message, setMessage] = useState("");
  const isSalpuriOne = params.get("planId") === "salpuri_one";

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    const planId = params.get("planId");

    if (!paymentKey || !orderId || !amount || !planId) {
      setState("error");
      setMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), planId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setMessage(data?.error ?? "결제 승인에 실패했습니다.");
          return;
        }
        setState("done");
      } catch {
        setState("error");
        setMessage("결제 확인 중 오류가 발생했습니다.");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center px-6 text-center gap-4">
      {state === "confirming" && (
        <>
          <div className="text-4xl">⏳</div>
          <p className="text-sm text-[#6B6661]">결제를 확인하고 있어요...</p>
        </>
      )}
      {state === "done" && (
        <>
          <div className="text-5xl">🎉</div>
          <h1 className="font-serif text-xl font-bold text-[#1F3D34]">
            {isSalpuriOne ? "살풀이 이용권이 준비됐어요" : "프리미엄이 활성화됐어요"}
          </h1>
          <p className="text-sm text-[#6B6661]">
            {isSalpuriOne ? "지금 바로 내 사주의 살을 확인해보세요." : "이제 역술가와 마음껏 대화할 수 있어요."}
          </p>
          <button
            onClick={() => router.push(isSalpuriOne ? "/premium/salpuri" : "/street")}
            className="mt-2 bg-[#1F3D34] text-white rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {isSalpuriOne ? "살풀이 보러 가기" : "대화하러 가기"}
          </button>
        </>
      )}
      {state === "error" && (
        <>
          <div className="text-5xl">⚠️</div>
          <h1 className="font-serif text-lg font-bold text-[#C0392B]">결제 확인 실패</h1>
          <p className="text-sm text-[#6B6661]">{message}</p>
          <button
            onClick={() => router.push("/premium/subscribe")}
            className="mt-2 border border-[#E5DFD4] text-[#1F3D34] rounded-xl px-6 py-3 text-sm font-semibold"
          >
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
