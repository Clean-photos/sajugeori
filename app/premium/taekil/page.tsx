import { PremiumGate } from "../_PremiumGate";
import { TaekilForm } from "./TaekilForm";

export default function PremiumTaekilPage() {
  return (
    <PremiumGate title="프리미엄 택일" subtitle="내 사주에 맞는 좋은 날을 정밀하게" path="/premium/taekil">
      <TaekilForm />
    </PremiumGate>
  );
}
