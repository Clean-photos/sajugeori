"use client";

import { useEffect, useRef, useState } from "react";
import { PREMIUM_MONTHLY } from "@/lib/billing/plans";
import { Spinner } from "@/components/ui/Spinner";

// Toss "기존 결제창"(API 개별연동, v1) SDK 타입 (최소).
// app/premium/buy/BuyClient.tsx와 동일한 이유로 v1 방식을 쓴다 — 이 계정의
// API 개별연동 계약이 기존 결제창까지만 포함하고, 최신 v2/결제위젯 일반결제는
// 별도 사업자 신청이 필요해 아직 없음(대시보드 확인 완료).
type TossPaymentsV1 = { requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void> };
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsV1;
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

export default function SubscribePage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tossRef = useRef<TossPaymentsV1 | null>(null);

  useEffect(() => {
    if (!CLIENT_KEY) {
      setError("결제 설정이 완료되지 않았습니다. (TOSS 키 미설정)");
      return;
    }
    // 이미 로드돼 있으면(StrictMode 이중 실행 등) 재사용 — 중복 초기화가
    // Toss SDK를 깨진 상태로 만드는 것을 확인했다(BuyClient.tsx와 동일 이슈).
    if (window.TossPayments) {
      tossRef.current = window.TossPayments(CLIENT_KEY);
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1";
    script.async = true;
    script.onload = () => {
      if (!window.TossPayments) return;
      tossRef.current = window.TossPayments(CLIENT_KEY);
      setReady(true);
    };
    script.onerror = () => setError("결제 모듈을 불러오지 못했습니다.");
    document.body.appendChild(script);
  }, []);

  async function handlePay() {
    if (!tossRef.current) return;
    setLoading(true);
    setError("");
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const origin = window.location.origin;
    try {
      await tossRef.current.requestPayment("카드", {
        amount: PREMIUM_MONTHLY.amount,
        orderId,
        orderName: PREMIUM_MONTHLY.name,
        successUrl: `${origin}/premium/success?planId=${PREMIUM_MONTHLY.id}`,
        failUrl: `${origin}/premium/fail`,
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
        <h1 className="font-serif text-2xl font-bold">사주거리 프리미엄</h1>
      </header>

      <div className="flex-1 px-5 py-7 max-w-sm mx-auto w-full flex flex-col gap-5">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1A1A18] mb-3">{PREMIUM_MONTHLY.name}</p>
          <ul className="flex flex-col gap-2 text-sm text-[#6B6661]">
            <li>· 역술가와 대화 월 1,000회</li>
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
          className="w-full flex items-center justify-center gap-2 bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {(loading || !ready) && <Spinner />}
          {loading ? "결제창 여는 중..." : ready ? "결제하고 시작하기" : "준비 중..."}
        </button>

        <p className="text-center text-[11px] text-[#6B6661] leading-relaxed">
          결제 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
