import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { PremiumGate } from "../_PremiumGate";
import { YearlyForm } from "./YearlyForm";

export const metadata: Metadata = {
  title: "프리미엄 연운세 — 올해와 내년의 흐름을 월별로 | 사주거리",
  description:
    "세운과 12개월 월운을 실제로 계산해 분기별·월별 흐름, 재물·관계·건강운까지 깊이 있게 풀이합니다. 조심할 달과 기회의 달을 근거와 함께 짚어 드립니다.",
  alternates: { canonical: "/premium/yearly" },
};

export default async function PremiumYearlyPage() {
  // 생성 직전 확정 화면에 등록된 내 사주를 채워 두기 위해 서버에서 미리 읽는다.
  // 없으면 null — 확정 화면이 빈 폼으로 뜨고, 입력값이 본인 프로필로 저장된다(016 규칙).
  const session = await auth();
  const profile = session?.user?.id ? await loadOwnProfile(session.user.id) : null;
  const saved = profile
    ? { birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }
    : null;

  return (
    <PremiumGate
      title="프리미엄 연운세" subtitle="올해와 내년의 흐름을 월별로 깊이 있게"
      path="/premium/yearly"
      oneTime={{ productId: "yearly_one", buyPath: "/premium/buy?product=yearly_one", priceLabel: "990원" }}
      sampleKey="yearly"
    >
      <YearlyForm saved={saved} />
    </PremiumGate>
  );
}
