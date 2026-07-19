import type { Metadata } from "next";

// page.tsx가 "use client"라 메타데이터를 내보낼 수 없어 layout에서 선언한다.
export const metadata: Metadata = {
  title: "무료 궁합 — 두 사람의 사주로 보는 궁합 | 사주거리",
  description:
    "두 사람의 생년월일로 각자의 일간과 오행 구성을 세우고, 서로의 기운이 돕는지 부딪치는지를 분석합니다. 연인·부부뿐 아니라 친구·동료와의 궁합도 볼 수 있습니다.",
  alternates: { canonical: "/free/compatibility" },
};

export default function FreeCompatibilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
