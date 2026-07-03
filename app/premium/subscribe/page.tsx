"use client";

import { useEffect, useRef, useState } from "react";
import { PREMIUM_MONTHLY } from "@/lib/billing/plans";

// Toss v2 표준 결제 SDK 타입 (최소)
type TossPayment = {
  requestPayment: (opts: Record<string, unknown>) => Promise<void>;
};
type TossPaymentsSDK = {
  payment: (opts: { customerKey: string }) => TossPayment;
};
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsSDK;
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

export default function SubscribePage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const paymentRef = useRef<TossPayment | null>(null);

  useEffect(() => {
    if (!CLIENT_KEY) {
      setError("결제 설정이 완료되지 않았습니다. (TOSS 키 미설정)");
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => {
      if (!window.TossPayments) return;
      const toss = window.TossPayments(CLIENT_KEY);
      // 단건 결제는 ANONYMOUS customerKey 사용 가능
      paymentRef.current = toss.payment({ customerKey: "ANONYMOUS" });
      setReady(true);
    };
    script.onerror = () => setError("결제 모듈을 불러오지 못했습니다.");
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  async function handlePay() {
    if (!paymentRef.current) return;
    setLoading(true);
    setError("");
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const origin = window.location.origin;
    try {
      await paymentRef.current.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: PREMIUM_MONTHLY.amount },
        orderId,
        orderName: PREMIUM_MONTHLY.name,
        successUrl: `${origin}/premium/success?planId=${PREMIUM_MONTHLY.id}`,
        failUrl: `${origin}/premium/fail`,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : "결제를 시작할 수 없습니다.";
      // 사용자가 결제창을 닫은 경우는 에러로 표시하지 않음
      if (!/cancel|닫|취소/i.test(msg)) setError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <header className="px-5 pt-14 pb-6 bg-[#1F3D34] text-white">
        <p className="text-xs opacity-70 mb-1">프리미엄 구독</p>
        <h1 className="font-serif text-2xl font-bold">Captique 프리미엄</h1>
      </header>

      <div className="flex-1 px-5 py-7 max-w-sm mx-auto w-full flex flex-col gap-5">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1A1A18] mb-3">{PREMIUM_MONTHLY.name}</p>
          <ul className="flex flex-col gap-2 text-sm text-[#6B6661]">
            <li>· 역술가와 무제한 대화</li>
            <li>· 전체 사주 풀이 열람</li>
            <li>· 연도별 운세·택일 무제한</li>
          </ul>
          <p className="mt-4 text-2xl font-bold text-[#1F3D34]">
            {PREMIUM_MONTHLY.amount.toLocaleString()}원
            <span className="text-sm font-normal text-[#6B6661]"> / 30일</span>
          </p>
        </div>

        {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

        <button
          onClick={handlePay}
          disabled={!ready || loading}
          className="w-full bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {loading ? "결제창 여는 중..." : ready ? "결제하고 시작하기" : "준비 중..."}
        </button>

        <p className="text-center text-[11px] text-[#6B6661] leading-relaxed">
          결제 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
