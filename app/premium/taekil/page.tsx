import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { PremiumGate } from "../_PremiumGate";
import { TaekilForm } from "./TaekilForm";

export const metadata: Metadata = {
  title: "프리미엄 택일 — 내 사주에 맞는 좋은 날 | 사주거리",
  description:
    "실제 일진을 계산해 내 사주의 용신과 맞는 최길일을 찾습니다. 결혼·이사·개업 등 목적에 맞는 추천 날짜와 피해야 할 날을 근거와 함께 풀이합니다.",
  alternates: { canonical: "/premium/taekil" },
};

export default async function PremiumTaekilPage() {
  // 생성 직전 확정 화면에 등록된 내 사주를 채워 두기 위해 서버에서 미리 읽는다.
  // 없으면 null — 확정 화면이 빈 폼으로 뜨고, 입력값이 본인 프로필로 저장된다(016 규칙).
  const session = await auth();
  const profile = session?.user?.id ? await loadOwnProfile(session.user.id) : null;
  const saved = profile
    ? { birth_date: profile.birth_date, birth_time: profile.birth_time, gender: profile.gender }
    : null;

  return (
    <PremiumGate
      title="프리미엄 택일" subtitle="내 사주에 맞는 좋은 날을 정밀하게"
      path="/premium/taekil"
      oneTime={{ productId: "taekil_one", buyPath: "/premium/buy?product=taekil_one", priceLabel: "990원" }}
      sampleKey="taekil"
    >
      <TaekilForm saved={saved} />
    </PremiumGate>
  );
}
