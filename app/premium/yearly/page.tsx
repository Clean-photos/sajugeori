import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { YearlyForm } from "./YearlyForm";

export const metadata: Metadata = {
  title: "프리미엄 연운세 — 올해와 내년의 흐름을 월별로 | 사주거리",
  description:
    "세운과 12개월 월운을 실제로 계산해 분기별·월별 흐름, 재물·관계·건강운까지 깊이 있게 풀이합니다. 조심할 달과 기회의 달을 근거와 함께 짚어 드립니다.",
  alternates: { canonical: "/premium/yearly" },
};

export default function PremiumYearlyPage() {
  return (
    <PremiumGate
      title="프리미엄 연운세" subtitle="올해와 내년의 흐름을 월별로 깊이 있게"
      path="/premium/yearly"
      oneTime={{ productId: "yearly_one", buyPath: "/premium/buy?product=yearly_one", priceLabel: "990원" }}
      sampleKey="yearly"
    >
      <YearlyForm />
    </PremiumGate>
  );
}
