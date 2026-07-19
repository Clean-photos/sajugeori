import type { Metadata } from "next";

// page.tsx가 "use client"라 메타데이터를 내보낼 수 없어 layout에서 선언한다.
export const metadata: Metadata = {
  title: "무료 택일 — 이사·개업·계약 좋은 날 고르기 | 사주거리",
  description:
    "그날의 일진(日辰)이 내 사주와 어떻게 어울리는지 계산해 좋은 날을 추려 드립니다. 이사·개업·계약·혼례처럼 새로 시작하는 일의 날짜를 정할 때 참고하세요.",
  alternates: { canonical: "/free/taekil" },
};

export default function FreeTaekilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
