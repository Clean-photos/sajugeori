import type { Metadata } from "next";

// 구독(5,900원/30일)은 더 이상 판매하지 않는다. 기존 구독자의 갱신 경로로만 남겨 두므로
// 어디에서도 링크하지 않고 색인에서도 제외한다. 인정 로직(isPremiumUser)은 그대로 유지.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
