"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SALPURI_ONE } from "@/lib/billing/plans";

// Toss v2 표준 결제 SDK 타입 (최소) — subscribe 페이지와 동일 패턴
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

export default function SalpuriBuyPage() {
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
        amount: { currency: "KRW", value: SALPURI_ONE.amount },
        orderId,
        orderName: SALPURI_ONE.name,
        successUrl: `${origin}/premium/success?planId=${SALPURI_ONE.id}`,
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
        <Link href="/premium/salpuri" className="flex items-center gap-2 text-white/70 text-sm mb-4 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          살풀이
        </Link>
        <p className="text-xs opacity-70 mb-1">1회 이용권</p>
        <h1 className="font-serif text-2xl font-bold">프리미엄 살풀이</h1>
      </header>

      <div className="flex-1 px-5 py-7 max-w-sm mx-auto w-full flex flex-col gap-5">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1A1A18] mb-3">{SALPURI_ONE.name}</p>
          <ul className="flex flex-col gap-2 text-sm text-[#6B6661]">
            <li>· 내 사주의 신살을 실제 계산해 검출</li>
            <li>· 자리별(연·월·일·시) 작용과 활용법 풀이</li>
            <li>· 결제 후 1회 열람 (구독 아님)</li>
          </ul>
          <p className="mt-4 text-2xl font-bold text-[#1F3D34]">
            {SALPURI_ONE.amount.toLocaleString()}원
            <span className="text-sm font-normal text-[#6B6661]"> / 1회</span>
          </p>
        </div>

        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-xl p-3.5 text-xs text-[#6B6661] leading-relaxed">
          프리미엄 구독(5,900원/30일)에는 살풀이가 포함되어 있어요.
          역술가 대화까지 쓰실 거라면 <Link href="/premium/subscribe" className="underline text-[#C8743A]">구독</Link>이 더 유리합니다.
        </div>

        {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

        <button
          onClick={handlePay}
          disabled={!ready || loading}
          className="w-full bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {loading ? "결제창 여는 중..." : ready ? "990원 결제하고 보기" : "준비 중..."}
        </button>

        <p className="text-center text-[11px] text-[#6B6661] leading-relaxed">
          결제 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
