import { PremiumGate } from "../_PremiumGate";
import { YearlyForm } from "./YearlyForm";

export default function PremiumYearlyPage() {
  return (
    <PremiumGate title="프리미엄 연운세" subtitle="올해와 내년의 흐름을 월별로 깊이 있게" path="/premium/yearly">
      <YearlyForm />
    </PremiumGate>
  );
}
