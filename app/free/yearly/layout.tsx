import type { Metadata } from "next";

// page.tsx가 "use client"라 메타데이터를 내보낼 수 없어 layout에서 선언한다.
export const metadata: Metadata = {
  title: "무료 연운세 — 올해의 운세와 신년운세 | 사주거리",
  description:
    "그해의 간지가 내 사주 및 대운과 어떻게 어울리는지 계산해 한 해의 흐름을 읽습니다. 재물·직업·인간관계 중 어느 영역이 두드러지는지 함께 살펴보세요.",
  alternates: { canonical: "/free/yearly" },
};

export default function FreeYearlyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
