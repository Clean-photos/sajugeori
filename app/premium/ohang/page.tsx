import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { WuxingResultForm } from "./WuxingResultForm";

export const metadata: Metadata = {
  title: "오행 보완 리포트 — 부족한 기운을 채우는 법 | 사주거리",
  description:
    "오행 지도부터 채우는 법·어울리는 사람·3년 세운 처방까지, 당신 사주에 맞춰 실제로 무엇을 하면 되는지 정리해 드립니다.",
  alternates: { canonical: "/premium/ohang" },
};

export default function PremiumWuxingPage() {
  return (
    <PremiumGate
      title="오행 보완 리포트"
      subtitle="부족한 기운을 무엇으로, 언제 채울지"
      path="/premium/ohang"
      oneTime={{ productId: "wuxing_one", buyPath: "/premium/buy?product=wuxing_one", priceLabel: "990원" }}
    >
      <WuxingResultForm />
    </PremiumGate>
  );
}
