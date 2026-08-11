import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { TaekilForm } from "./TaekilForm";

export const metadata: Metadata = {
  title: "프리미엄 택일 — 내 사주에 맞는 좋은 날 | 사주거리",
  description:
    "실제 일진을 계산해 내 사주의 용신과 맞는 최길일을 찾습니다. 결혼·이사·개업 등 목적에 맞는 추천 날짜와 피해야 할 날을 근거와 함께 풀이합니다.",
  alternates: { canonical: "/premium/taekil" },
};

export default function PremiumTaekilPage() {
  return (
    <PremiumGate
      title="프리미엄 택일" subtitle="내 사주에 맞는 좋은 날을 정밀하게"
      path="/premium/taekil"
      oneTime={{ productId: "taekil_one", buyPath: "/premium/buy?product=taekil_one", priceLabel: "990원" }}
      sampleKey="taekil"
    >
      <TaekilForm />
    </PremiumGate>
  );
}
