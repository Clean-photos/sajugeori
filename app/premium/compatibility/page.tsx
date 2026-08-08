import { PremiumGate } from "../_PremiumGate";
import { CompatForm } from "./CompatForm";

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
