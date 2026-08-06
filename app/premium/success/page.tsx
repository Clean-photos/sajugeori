"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { REPORT_PRODUCTS, BUNDLE_CREDITS } from "@/lib/billing/plans";

/** 결제한 상품에 맞는 완료 화면 문구와 이동 경로. 구독은 더 이상 판매하지 않지만
 *  기존 구독자의 갱신 결제가 들어올 수 있어 fallback을 남긴다. */
function outcomeFor(planId: string | null) {
  const report = REPORT_PRODUCTS.find((p) => p.productId === planId);
  if (report) {
    return {
      title: `${report.label} 이용권이 준비됐어요`,
      body: "지금 바로 리포트를 확인해 보세요.",
      cta: `${report.label} 보러 가기`,
      href: report.path,
    };
  }
  if (planId && BUNDLE_CREDITS[planId]) {
    return {
      title: "이용권이 준비됐어요",
      body: `리포트 ${BUNDLE_CREDITS[planId]}종을 원하는 것으로 골라 보실 수 있어요.`,
      cta: "리포트 고르러 가기",
      href: "/premium/menu",
    };
  }
  return {
    title: "프리미엄이 활성화됐어요",
    body: "이제 모든 프리미엄 리포트를 이용할 수 있어요.",
    cta: "리포트 보러 가기",
    href: "/premium/menu",
  };
}

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"confirming" | "done" | "error">("confirming");
  const [message, setMessage] = useState("");
  const outcome = outcomeFor(params.get("planId"));

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
          <h1 className="font-serif text-xl font-bold text-[#1F3D34]">{outcome.title}</h1>
          <p className="text-sm text-[#6B6661]">{outcome.body}</p>
          <button
            onClick={() => router.push(outcome.href)}
            className="mt-2 bg-[#1F3D34] text-white rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {outcome.cta}
          </button>
        </>
      )}
      {state === "error" && (
        <>
          <div className="text-5xl">⚠️</div>
          <h1 className="font-serif text-lg font-bold text-[#C0392B]">결제 확인 실패</h1>
          <p className="text-sm text-[#6B6661]">{message}</p>
          <button
            onClick={() => router.push("/premium/menu")}
            className="mt-2 border border-[#E5DFD4] text-[#1F3D34] rounded-xl px-6 py-3 text-sm font-semibold"
          >
            프리미엄으로 돌아가기
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
