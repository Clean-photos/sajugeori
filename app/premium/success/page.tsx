"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { REPORT_PRODUCTS, BUNDLE_CREDITS, DESTINY_PRODUCT_IDS } from "@/lib/billing/plans";

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
  if (planId && DESTINY_PRODUCT_IDS.includes(planId)) {
    return {
      title: "운명 설계도가 준비됐어요",
      body: "지금 바로 확장된 풀이를 확인해 보세요.",
      cta: "운명 설계도 보러 가기",
      href: "/premium/destiny",
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
  const [charged, setCharged] = useState(false);
  const [failedOrderId, setFailedOrderId] = useState("");
  const outcome = outcomeFor(params.get("planId"));

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    const planId = params.get("planId");

    if (!paymentKey || !orderId || !amount || !planId) {
      setState("error");
      setMessage("결제가 완료되지 않았습니다. 금액은 청구되지 않았습니다.");
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
          setFailedOrderId(orderId);
          if (data?.charged) {
            setCharged(true);
            setMessage(`결제는 확인되었으나 처리 중 문제가 발생했습니다. 주문번호 ${orderId}로 문의해주시면 확인해 드립니다.`);
          } else {
            setMessage(data?.error ? `결제가 완료되지 않았습니다. 금액은 청구되지 않았습니다. (${data.error})` : "결제가 완료되지 않았습니다. 금액은 청구되지 않았습니다.");
          }
          return;
        }
        setState("done");
      } catch {
        setState("error");
        setMessage("결제 확인 중 오류가 발생했습니다. 금액이 청구되었다면 문의해주세요.");
        setFailedOrderId(orderId);
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
          <h1 className="font-serif text-lg font-bold text-[#C0392B]">
            {charged ? "결제 확인 중 문제가 발생했어요" : "결제가 완료되지 않았어요"}
          </h1>
          <p className="text-sm text-[#6B6661] max-w-xs">{message}</p>
          {failedOrderId && (
            <p className="text-xs text-[#6B6661]/70">
              주문번호 {failedOrderId} · {new Date().toLocaleString("ko-KR")}
            </p>
          )}
          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            {charged && (
              <button
                onClick={() => router.push(`/contact?category=payment&subject=${encodeURIComponent(`결제 확인 문의 (주문번호 ${failedOrderId})`)}&message=${encodeURIComponent(`주문번호: ${failedOrderId}\n결제 시각: ${new Date().toLocaleString("ko-KR")}\n\n결제는 확인되었으나 처리 중 문제가 발생했다는 안내를 받았습니다. 확인 부탁드립니다.`)}`)}
                className="bg-[#C8743A] text-white rounded-xl px-6 py-3 text-sm font-semibold"
              >
                결제 문의하기
              </button>
            )}
            <button
              onClick={() => router.push("/premium/menu")}
              className="border border-[#E5DFD4] text-[#1F3D34] rounded-xl px-6 py-3 text-sm font-semibold"
            >
              프리미엄으로 돌아가기
            </button>
          </div>
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
