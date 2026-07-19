import type { Metadata } from "next";

// page.tsx가 "use client"라 메타데이터를 내보낼 수 없어 layout에서 선언한다.
export const metadata: Metadata = {
  title: "무료 사주 — 생년월일로 보는 사주팔자 풀이 | 사주거리",
  description:
    "생년월일과 태어난 시각으로 사주팔자를 세우고 오행의 균형과 일간의 강약을 분석합니다. 광고 시청 후 무료로 확인하세요. 태어난 시각을 몰라도 연·월·일 세 기둥으로 볼 수 있습니다.",
  alternates: { canonical: "/free/saju" },
};

export default function FreeSajuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
