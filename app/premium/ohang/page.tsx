import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { PremiumGate } from "../_PremiumGate";
import { WuxingResultForm } from "./WuxingResultForm";

export const metadata: Metadata = {
  title: "오행 보완 리포트 — 부족한 기운을 채우는 법 | 사주거리",
  description:
    "오행 지도부터 채우는 법·어울리는 사람·3년 세운 처방까지, 당신 사주에 맞춰 실제로 무엇을 하면 되는지 정리해 드립니다.",
  alternates: { canonical: "/premium/ohang" },
};

export default async function PremiumWuxingPage() {
  // 생성 직전 확정 화면에 등록된 내 사주를 채워 두기 위해 서버에서 미리 읽는다.
  // 없으면 null — 확정 화면이 빈 폼으로 뜨고, 입력값이 본인 프로필로 저장된다(016 규칙).
  const session = await auth();
  const profile = session?.user?.id ? await loadOwnProfile(session.user.id) : null;
  const saved = profile
    ? { birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }
    : null;

  return (
    <PremiumGate
      title="오행 보완 리포트"
      subtitle="부족한 기운을 무엇으로, 언제 채울지"
      path="/premium/ohang"
      oneTime={{ productId: "wuxing_one", buyPath: "/premium/buy?product=wuxing_one", priceLabel: "990원" }}
    >
      <WuxingResultForm saved={saved} />
    </PremiumGate>
  );
}
