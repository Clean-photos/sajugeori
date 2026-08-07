import Link from "next/link";
import type { Metadata } from "next";
import { REPORT_PRODUCTS } from "@/lib/billing/plans";
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
  const planId = product ?? "saju_one";
  const item = REPORT_PRODUCTS.find((r) => r.productId === planId);
  const returnTo = item?.path ?? "/premium/menu";

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <header className="px-5 pt-14 pb-6 bg-[#1F3D34] text-white">
        <Link href={returnTo} className="flex items-center gap-2 text-white/70 text-sm mb-4 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          돌아가기
        </Link>
        <p className="text-xs opacity-70 mb-1">1회 이용권</p>
        <h1 className="font-serif text-2xl font-bold">{item?.label ?? "프리미엄 리포트"}</h1>
      </header>

      <BuyClient planId={planId} returnTo={returnTo} />
    </div>
  );
}
