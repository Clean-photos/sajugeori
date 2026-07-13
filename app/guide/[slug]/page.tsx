import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ARTICLES, getArticle } from "../articles";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "사주거리" };
  return {
    title: `${article.title} | 사주거리`,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const others = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/guide" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          읽을거리
        </Link>
        <h1 className="relative font-serif text-[26px] font-bold text-white leading-tight">{article.title}</h1>
        <p className="relative text-sm text-white/60 mt-2">약 {article.readMinutes}분 읽기</p>
      </header>

      <article className="px-5 py-7 flex flex-col gap-4">
        {article.body.map((para, i) =>
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
        <p className="text-xs font-medium text-[#6B6661] tracking-wide mb-3 px-1">다른 읽을거리</p>
        <div className="flex flex-col gap-2.5">
          {others.map((a) => (
            <Link key={a.slug} href={`/guide/${a.slug}`}>
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3 active:scale-[0.98] transition-all">
                <p className="text-sm font-semibold text-[#1F3D34]">{a.title}</p>
                <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{a.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
