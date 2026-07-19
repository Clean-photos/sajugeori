import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CATEGORY_LABEL, TERMS, getTerm } from "../terms";

export function generateStaticParams() {
  return TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const term = getTerm(slug);
  if (!term) return { title: "사주거리" };
  const title = term.hanja ? `${term.term}(${term.hanja})` : term.term;
  return {
    title: `${title} 뜻 | 사주 용어 백과 | 사주거리`,
    description: term.summary,
    alternates: { canonical: `/dictionary/${term.slug}` },
  };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const term = getTerm(slug);
  if (!term) notFound();

  const others = TERMS.filter((t) => t.category === term.category && t.slug !== slug).slice(0, 4);
  const fallback = others.length ? others : TERMS.filter((t) => t.slug !== slug).slice(0, 4);
  const isSinsal = term.category === "sinsal";

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/dictionary" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          용어 백과
        </Link>
        <p className="relative text-xs font-medium tracking-[0.15em] text-[#C8743A] mb-2">{CATEGORY_LABEL[term.category]}</p>
        <div className="relative flex items-baseline gap-2.5">
          <h1 className="font-serif text-[28px] font-bold text-white leading-tight">{term.term}</h1>
          {term.hanja && <span className="text-lg text-white/50">{term.hanja}</span>}
        </div>
        <p className="relative text-sm text-white/60 mt-2">약 {term.readMinutes}분 읽기</p>
      </header>

      <article className="px-5 py-7 flex flex-col gap-4">
        {term.body.map((para, i) =>
          para.startsWith("## ") ? (
            <h2 key={i} className="font-serif text-lg font-bold text-[#1F3D34] mt-3">{para.slice(3)}</h2>
          ) : (
            <p key={i} className="text-[15px] text-[#1A1A18] leading-[1.85]">{para}</p>
          )
        )}
      </article>

      <div className="px-5">
        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
          본 글은 사주·명리학의 일반적인 개념을 소개하는 참고 자료이며, 오락 및 교양 목적으로 제공됩니다.
          개인의 중요한 결정은 해당 분야 전문가와 상담하시기 바랍니다.
        </div>
      </div>

      <section className="px-4 mt-7">
        <p className="text-xs font-medium text-[#6B6661] tracking-wide mb-3 px-1">이어서 보면 좋은 용어</p>
        <div className="flex flex-col gap-2.5">
          {fallback.map((t) => (
            <Link key={t.slug} href={`/dictionary/${t.slug}`}>
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3 active:scale-[0.98] transition-all">
                <p className="text-sm font-semibold text-[#1F3D34]">
                  {t.term}
                  {t.hanja && <span className="ml-1.5 text-xs font-normal text-[#6B6661]/70">{t.hanja}</span>}
                </p>
                <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{t.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 신살 항목은 살풀이로, 나머지는 무료 사주로 유도 */}
      <div className="px-4 mt-6">
        <Link href={isSinsal ? "/premium/salpuri" : "/free/saju"}>
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
            <div>
              <p className="text-sm font-semibold text-white">
                {isSinsal ? "내 살풀이 보러가기" : "내 사주는 어떨까?"}
              </p>
              <p className="text-xs text-white/60 mt-0.5">
                {isSinsal
                  ? "내 사주에 어떤 살이 있는지 확인하고 풀이 받기"
                  : "생년월일로 무료 사주 확인하기"}
              </p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8743A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>
      </div>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
