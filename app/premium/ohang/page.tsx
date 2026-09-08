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

// §1(CoS 결정 2026-09-08): autostart 자동제출(쿼리로 birth_date 등을 받아 재생성을
// 태우는 방식)을 폐기했다 — 그건 "다시 보기"가 아니라 "다시 만들기" 요청이라
// 1회권을 이미 쓴 사람은 여기서 결제 게이트에 막혔다(실측 재현). 저장된 리포트를
// 다시 여는 경로는 app/premium/ohang/[id](이용권 검사 없음)가 전담한다. 이 페이지는
// 순수하게 "새로 만들기" 전용이라 검색 파라미터를 더 이상 받지 않는다.
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
