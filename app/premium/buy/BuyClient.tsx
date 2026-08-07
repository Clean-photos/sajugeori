"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPlan, BUNDLE_3, BUNDLE_ALL, REPORT_PRODUCTS, ONE_REPORT_PRICE } from "@/lib/billing/plans";

// Toss v2 표준 결제 SDK 타입 (최소)
type TossPayment = { requestPayment: (opts: Record<string, unknown>) => Promise<void> };
type TossPaymentsSDK = { payment: (opts: { customerKey: string }) => TossPayment };
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsSDK;
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

/** 상품별 안내 문구 */
const BENEFITS: Record<string, string[]> = {
  saju_one: ["성격·재물·직업·관계 등 여덟 영역 심층 풀이", "일간의 강약과 용신, 대운 흐름까지 반영"],
  compatibility_one: ["두 사람의 사주를 양방향으로 비교", "서로에게 주는 영향과 조율할 지점"],
  pet_one: ["강아지·고양이별 행동 특성을 반영한 풀이", "아이의 속마음과 함께하면 좋은 것까지"],
  taekil_one: ["원하는 기간의 날짜를 일진 기준으로 채점", "내 사주와 맞는 날을 추려 안내"],
  yearly_one: ["그해 세운과 열두 달 월운을 함께 계산", "재물·직업·관계별 흐름"],
  salpuri_one: ["내 사주의 신살을 실제 계산해 검출", "자리별(연·월·일·시) 작용과 활용법"],
};

export function BuyClient({ planId, returnTo }: { planId: string; returnTo: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const paymentRef = useRef<TossPayment | null>(null);

  const plan = getPlan(planId);

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

  async function pay(targetId: string) {
    const p = getPlan(targetId);
    if (!paymentRef.current || !p) return;
    setLoading(targetId);
    setError("");
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const origin = window.location.origin;
    try {
      await paymentRef.current.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: p.amount },
        orderId,
        orderName: p.name,
        successUrl: `${origin}/premium/success?planId=${p.id}&next=${encodeURIComponent(returnTo)}`,
        failUrl: `${origin}/premium/fail`,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (e) {
      setLoading(null);
      const msg = e instanceof Error ? e.message : "결제를 시작할 수 없습니다.";
      // 사용자가 결제창을 닫은 경우는 에러로 표시하지 않음
      if (!/cancel|닫|취소/i.test(msg)) setError(msg);
    }
  }

  if (!plan) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-[#6B6661]">알 수 없는 상품입니다.</p>
        <Link href="/premium/menu" className="text-sm text-[#C8743A] underline mt-3 inline-block">프리미엄 메뉴로</Link>
      </div>
    );
  }

  const benefits = BENEFITS[plan.id] ?? [];
  const label = REPORT_PRODUCTS.find((r) => r.productId === plan.id)?.label ?? plan.name;

  return (
    <div className="flex-1 px-5 py-7 max-w-sm mx-auto w-full flex flex-col gap-4">
      {/* 선택한 단품 */}
      <div className="bg-[#FBF8F2] border-2 border-[#C8743A] rounded-2xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-semibold text-[#1A1A18]">{label}</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C8743A]/15 text-[#8A5228]">선택함</span>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-[#6B6661]">
          {benefits.map((b) => <li key={b}>· {b}</li>)}
          <li>· 결제 후 열람하며, 같은 결과는 언제든 다시 볼 수 있어요</li>
        </ul>
        <p className="mt-4 text-2xl font-bold text-[#1F3D34]">
          {plan.amount.toLocaleString()}원
          <span className="text-sm font-normal text-[#6B6661]"> / 1회</span>
        </p>
        <button
          onClick={() => pay(plan.id)}
          disabled={!ready || loading !== null || !agreed}
          className="mt-3 w-full bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {loading === plan.id ? "결제창 여는 중..." : ready ? `${plan.amount.toLocaleString()}원 결제하고 보기` : "준비 중..."}
        </button>
      </div>

      {/* 묶음권 — 개당 단가가 낮아 자연스럽게 상위 상품으로 유도 */}
      <p className="text-xs font-medium text-[#6B6661] mt-1 px-1">여러 개 보실 거라면</p>

      <div className="bg-[#1F3D34] rounded-2xl p-5 text-white">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">{BUNDLE_3.name}</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C8743A] text-white">가장 인기</span>
        </div>
        <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
          6종 리포트 중 원하는 것을 골라 3번 열람할 수 있어요.
          단품 3개({(ONE_REPORT_PRICE * 3).toLocaleString()}원)보다 저렴합니다.
        </p>
        <p className="mt-3 text-2xl font-bold">
          {BUNDLE_3.amount.toLocaleString()}원
          <span className="text-sm font-normal text-white/60"> · 개당 {Math.round(BUNDLE_3.amount / 3).toLocaleString()}원</span>
        </p>
        <button
          onClick={() => pay(BUNDLE_3.id)}
          disabled={!ready || loading !== null || !agreed}
          className="mt-3 w-full bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all"
        >
          {loading === BUNDLE_3.id ? "결제창 여는 중..." : "3종 선택권 구매"}
        </button>
      </div>

      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
        <p className="text-sm font-semibold text-[#1A1A18]">{BUNDLE_ALL.name}</p>
        <p className="text-xs text-[#6B6661] mt-1.5 leading-relaxed">
          여섯 가지 리포트를 모두 열람할 수 있어요. 개당 {Math.round(BUNDLE_ALL.amount / 6).toLocaleString()}원입니다.
        </p>
        <p className="mt-3 text-xl font-bold text-[#1F3D34]">{BUNDLE_ALL.amount.toLocaleString()}원</p>
        <button
          onClick={() => pay(BUNDLE_ALL.id)}
          disabled={!ready || loading !== null || !agreed}
          className="mt-3 w-full border border-[#1F3D34] text-[#1F3D34] rounded-xl py-3 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all"
        >
          {loading === BUNDLE_ALL.id ? "결제창 여는 중..." : "전체 열람권 구매"}
        </button>
      </div>

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

      {/* 전자상거래법 제17조 제2항 제5호 — 즉시 제공되는 디지털 콘텐츠는
          결제 전 고지와 동의를 받아야 청약철회를 제한할 수 있다. 체크 전에는
          결제 버튼을 비활성화해 실제 동의를 받는 절차로 만든다. */}
      <label className="flex items-start gap-2.5 px-1 text-xs text-[#6B6661] leading-relaxed cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#C8743A] flex-shrink-0"
        />
        <span>
          결제 즉시 리포트가 생성·제공되며, 이 경우{" "}
          <Link href="/terms" className="underline">이용약관</Link> 5조에 따라 청약철회(환불)가
          제한됨을 확인했습니다.
        </span>
      </label>

      <p className="text-center text-[11px] text-[#6B6661] leading-relaxed mt-1">
        결제 시 <Link href="/terms" className="underline">이용약관</Link> 및{" "}
        <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하는 것으로 간주합니다.
      </p>
    </div>
  );
}
