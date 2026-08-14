"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPlan, REPORT_PRODUCTS } from "@/lib/billing/plans";
import { Spinner } from "@/components/ui/Spinner";

// Toss "기존 결제창"(API 개별연동, v1) SDK 타입 (최소).
// 이 계정은 API 개별연동 상품이 자동결제(빌링)·기존 결제창·정산지급대행·
// 현금영수증만 계약되어 있고(대시보드 확인 완료), 최신 v2/standard 일반결제나
// 결제위젯 일반결제는 별도 사업자 신청(전자결제 심사)이 필요해 아직 없다.
// 그래서 지금 활성화된 "기존 결제창"(v1) 방식으로 연동한다.
type TossPaymentsV1 = { requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void> };
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsV1;
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
  destiny_blueprint_one: ["프리미엄 사주 여덟 영역을 모두 포함", "평생 대운 로드맵과 인생 전환점까지 확장"],
  destiny_upgrade: ["이미 보신 프리미엄 사주에 이어서", "평생 대운 로드맵과 인생 전환점을 추가로"],
};

export function BuyClient({ planId, returnTo }: { planId: string; returnTo: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const tossRef = useRef<TossPaymentsV1 | null>(null);

  const plan = getPlan(planId);

  useEffect(() => {
    if (!CLIENT_KEY) {
      setError("결제 설정이 완료되지 않았습니다. (TOSS 키 미설정)");
      return;
    }
    // 이미 로드돼 있으면(리액트 StrictMode의 effect 이중 실행, 페이지 재방문 등)
    // 스크립트를 또 넣지 않고 바로 재사용한다 — 중복 초기화가 Toss SDK를
    // 깨진 상태로 만들어 "결제위젯 연동 키는 지원하지 않습니다" 같은 엉뚱한
    // 에러를 던지는 걸 실제로 확인했다.
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
    // cleanup에서 스크립트를 제거하지 않는다 — StrictMode 이중 실행 시
    // 정상 로드된 스크립트를 지웠다가 다시 넣는 과정에서 SDK가 깨진다.
  }, []);

  async function pay() {
    if (!tossRef.current || !plan) return;
    setLoading(plan.id);
    setError("");
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const origin = window.location.origin;
    try {
      await tossRef.current.requestPayment("카드", {
        amount: plan.amount,
        orderId,
        orderName: plan.name,
        successUrl: `${origin}/premium/success?planId=${plan.id}&next=${encodeURIComponent(returnTo)}`,
        failUrl: `${origin}/premium/fail`,
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
          onClick={pay}
          disabled={!ready || loading !== null || !agreed}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
        >
          {(loading === plan.id || !ready) && <Spinner />}
          {loading === plan.id ? "결제창 여는 중..." : ready ? `${plan.amount.toLocaleString()}원 결제하고 보기` : "준비 중..."}
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
