import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { SalpuriForm } from "./SalpuriForm";

export const metadata: Metadata = {
  title: "프리미엄 살풀이 | 사주거리",
  description:
    "내 사주에 어떤 살(殺)이 있는지 실제로 계산해 풀이합니다. 도화살·역마살·양인살·귀문관살부터 천을귀인·금여 같은 길신까지, 자리별 작용과 활용법을 함께 안내합니다.",
};

export default function PremiumSalpuriPage() {
  return (
    <PremiumGate
      title="프리미엄 살풀이"
      subtitle="내 사주에 든 살을 찾아 하나씩 풀이"
      path="/premium/salpuri"
      oneTime={{ productId: "salpuri_one", buyPath: "/premium/salpuri/buy", priceLabel: "990원" }}
    >
      <SalpuriForm />
    </PremiumGate>
  );
}
