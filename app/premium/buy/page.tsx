import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { hasSajuReport } from "@/lib/billing/access";
import { REPORT_PRODUCTS, getPlan } from "@/lib/billing/plans";
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

  // 운명 설계도 업그레이드가(6,900원)는 프리미엄 사주를 이미 본 사람만 결제할 수
  // 있다. 이 화면은 눈에 띄지 않는 링크로만 안내하지만, URL을 직접 입력해도
  // 자격 없이는 할인가로 결제할 수 없도록 서버에서 한 번 더 막는다 — 자격이
  // 없으면 정가(7,900원) 상품으로 조용히 바꿔서 보여준다.
  if (planId === "destiny_upgrade") {
    const session = await auth();
    const eligible = session?.user?.id ? await hasSajuReport(session.user.id) : false;
    if (!eligible) redirect("/premium/buy?product=destiny_blueprint_one");
  }

  const item = REPORT_PRODUCTS.find((r) => r.productId === planId);
  const returnTo = item?.path ?? "/premium/menu";
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
      </header>

      <BuyClient planId={planId} returnTo={returnTo} />
    </div>
  );
}
