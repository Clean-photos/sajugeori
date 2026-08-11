import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { CompatForm } from "./CompatForm";

export const metadata: Metadata = {
  title: "프리미엄 궁합 — 두 사람의 사주를 양방향으로 | 사주거리",
  description:
    "두 사람의 사주를 서로 주고받는 오행 관계까지 양방향으로 분석합니다. 잘 맞는 부분과 주의할 부분, 시기별 흐름까지 깊이 있게 풀이합니다.",
  alternates: { canonical: "/premium/compatibility" },
};

export default function PremiumCompatibilityPage() {
  return (
    <PremiumGate
      title="프리미엄 궁합" subtitle="내 사주와 상대를 양방향으로 심층 분석"
      path="/premium/compatibility"
      oneTime={{ productId: "compatibility_one", buyPath: "/premium/buy?product=compatibility_one", priceLabel: "990원" }}
      sampleKey="compatibility"
    >
      <CompatForm />
    </PremiumGate>
  );
}
