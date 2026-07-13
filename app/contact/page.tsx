import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ContactBoard } from "./ContactBoard";

export const metadata: Metadata = {
  title: "문의하기 | 사주거리",
  description: "사주거리 이용 중 궁금한 점이나 의견을 남겨주세요. 로그인 후 문의를 남기면 운영자가 확인합니다.",
};

export default async function ContactPage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Contact</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">문의하기</h1>
        <p className="relative text-sm text-white/60 mt-1">궁금한 점이나 의견을 남겨주세요</p>
      </header>

      {loggedIn ? (
        <ContactBoard />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8 py-20">
          <div className="w-14 h-14 rounded-full bg-[#1F3D34]/8 flex items-center justify-center text-2xl">🔒</div>
          <p className="text-sm font-medium text-[#1A1A18]">문의는 로그인 후 남길 수 있어요</p>
          <p className="text-xs text-[#6B6661] max-w-[260px] leading-relaxed">
            문의 내용은 운영자에게만 전달되며 다른 이용자에게 공개되지 않습니다.
          </p>
          <Link href="/login?redirect=/contact" className="rounded-xl bg-[#C8743A] text-white px-6 py-3 text-sm font-semibold">로그인하기</Link>
        </div>
      )}

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
