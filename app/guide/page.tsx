import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ARTICLES } from "./articles";

export const metadata: Metadata = {
  title: "사주 읽을거리 | 사주거리",
  description: "사주와 명리학의 기본 개념을 쉽게 풀어 쓴 읽을거리 모음. 사주란 무엇인가부터 오행·십성·궁합·사주 보는 법, 부족한 기운 채우는 법까지.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Guide</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">사주 읽을거리</h1>
        <p className="relative text-sm text-white/60 mt-1">명리학의 기본 개념과 많은 분들이 궁금해할 사주 이야기가 준비되어있습니다</p>
      </header>

      <section className="px-4 py-6 flex flex-col gap-3">
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/guide/${a.slug}`}>
            <article className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 active:scale-[0.98] transition-all shadow-sm">
              <h2 className="font-semibold text-base text-[#1F3D34]">{a.title}</h2>
              <p className="text-sm text-[#6B6661] mt-1.5 leading-snug">{a.summary}</p>
              <p className="text-[11px] text-[#6B6661]/60 mt-2">약 {a.readMinutes}분 읽기</p>
            </article>
          </Link>
        ))}
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
