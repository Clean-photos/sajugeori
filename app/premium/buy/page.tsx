import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { hasSajuReport } from "@/lib/billing/access";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { REPORT_PRODUCTS, DESTINY_PRODUCT_IDS, getPlan } from "@/lib/billing/plans";
import { BuyClient } from "./BuyClient";

export const metadata: Metadata = {
  title: "리포트 구매 | 사주거리",
  description: "프리미엄 리포트 1회 이용권을 구매합니다.",
  robots: { index: false }, // 결제 화면은 색인 대상이 아니다
};

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  let planId = product ?? "saju_one";
  const session = await auth();

  // 운명 설계도 업그레이드가(6,900원)는 프리미엄 사주를 이미 본 사람만 결제할 수
  // 있다. 이 화면은 눈에 띄지 않는 링크로만 안내하지만, URL을 직접 입력해도
  // 자격 없이는 할인가로 결제할 수 없도록 서버에서 한 번 더 막는다 — 자격이
  // 없으면 정가(7,900원) 상품으로 조용히 바꿔서 보여준다.
  if (planId === "destiny_upgrade") {
    const eligible = session?.user?.id ? await hasSajuReport(session.user.id) : false;
    if (!eligible) redirect("/premium/buy?product=destiny_blueprint_one");
  }

  // §13(CoS+CEO 실물 확인, 2026-09-08, 9/2 4-2 재상향): 비구독자는 확정 화면을
  // 결제 "후"에 보므로, 결제 화면까지는 누구 사주로 만드는지 한 글자도 안
  // 보이는 채로 결제하고 있었다. 등록된 본인 사주가 있으면 여기서도 미리
  // 보여준다 — 실제 대상은 결제 후 확정 화면에서 여전히 바꿀 수 있으므로
  // 그 점도 함께 안내한다.
  const ownProfile = session?.user?.id ? await loadOwnProfile(session.user.id) : null;
  const targetLabel = ownProfile?.birth_date
    ? `${ownProfile.birth_date}(${ownProfile.calendar === "lunar" ? "음력" : "양력"}) ${ownProfile.gender === "M" ? "남성" : "여성"}`
    : null;

  const item = REPORT_PRODUCTS.find((r) => r.productId === planId);
  // U3(CoS+CEO 실물 확인, 2026-09-08): 운명 설계도는 REPORT_PRODUCTS(6종
  // 단건 리포트) 목록에 없어(별도 상품 체계) item이 항상 undefined였다 —
  // 결제 후 리포트 생성 화면 대신 상품 목록(/premium/menu)으로 튕겼다.
  // 결제 완료 후에는 항상 해당 상품 생성 화면으로 보낸다는 원칙에 맞춘다.
  const returnTo = item?.path ?? (DESTINY_PRODUCT_IDS.includes(planId as (typeof DESTINY_PRODUCT_IDS)[number]) ? "/premium/destiny" : "/premium/menu");
  const title = item?.label ?? getPlan(planId)?.name ?? "프리미엄 리포트";

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <header className="px-5 pt-14 pb-6 bg-[#1F3D34] text-white">
        <Link href={returnTo} className="flex items-center gap-2 text-white/70 text-sm mb-4 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          돌아가기
        </Link>
        <p className="text-xs opacity-70 mb-1">1회 이용권</p>
        <h1 className="font-serif text-2xl font-bold">{title}</h1>
        {targetLabel && (
          <p className="text-xs opacity-70 mt-2">
            {targetLabel} 사주로 만듭니다 · 다른 사주는 결제 후 확정 화면에서 선택할 수 있어요
          </p>
        )}
      </header>

      <BuyClient planId={planId} returnTo={returnTo} />
    </div>
  );
}
