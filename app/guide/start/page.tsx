import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ARTICLES, getArticle } from "../articles";
import { TERMS } from "@/app/dictionary/terms";

export const metadata: Metadata = {
  title: "사주 입문 코스 — 무엇부터 읽어야 할까 | 사주거리",
  description:
    "사주를 처음 접하는 분을 위한 순서 안내. 사주란 무엇인가부터 오행·십성·신살, 결과지 읽는 법까지 단계별로 무엇을 먼저 읽으면 좋은지 정리했습니다.",
  alternates: { canonical: "/guide/start" },
};

/** 단계별 코스 구성. slug는 ARTICLES에 실제로 존재해야 한다. */
const COURSE: { step: string; title: string; desc: string; slugs: string[] }[] = [
  {
    step: "1단계",
    title: "사주가 무엇인지부터",
    desc: "생년월일시가 어떻게 여덟 글자가 되는지, 그 글자들로 무엇을 보는지 큰 그림을 잡습니다. 여기만 읽어도 사주 이야기가 훨씬 편해집니다.",
    slugs: ["what-is-saju", "60-ganji-cycle"],
  },
  {
    step: "2단계",
    title: "오행 — 해석의 뼈대",
    desc: "목화토금수 다섯 기운과 그 사이의 상생·상극을 익힙니다. 사주 해석의 거의 모든 이야기가 여기서 출발합니다.",
    slugs: ["ohaeng", "ohaeng-mechanism"],
  },
  {
    step: "3단계",
    title: "십성 — 나와 글자의 관계",
    desc: "일간을 기준으로 나머지 글자들이 갖는 열 가지 역할입니다. 재물·직업·관계 이야기가 모두 여기서 나옵니다.",
    slugs: ["sipseong", "saju-personality"],
  },
  {
    step: "4단계",
    title: "결과지를 직접 읽어 보기",
    desc: "무료 사주를 본 뒤 결과지의 용어가 막막했다면 이 글부터 보세요. 실제 결과에 나오는 표현을 순서대로 짚어 드립니다.",
    slugs: ["how-to-read-your-result", "how-to-read"],
  },
  {
    step: "5단계",
    title: "궁금했던 주제들",
    desc: "기본기를 익힌 뒤 읽으면 좋은 이야기들입니다. 관심 가는 것부터 골라 보셔도 됩니다.",
    slugs: ["what-is-a-good-saju", "same-saju-same-life", "why-birth-time-matters", "saju-love"],
  },
];

export default function GuideStartPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/guide" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          읽을거리
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Start Here</p>
        <h1 className="relative font-serif text-[26px] font-bold text-white leading-tight">사주 입문 코스</h1>
        <p className="relative text-sm text-white/60 mt-2">무엇부터 읽어야 할지 순서대로 안내합니다</p>
      </header>

      <section className="px-5 py-6 flex flex-col gap-4">
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주에 관심이 생겨 검색해 보면 낯선 한자와 용어가 한꺼번에 쏟아집니다. 어디서부터
          손대야 할지 막막해서 그냥 덮어 두게 되는 경우가 많습니다. 그래서 사주거리의
          읽을거리 {ARTICLES.length}편을 난이도와 순서에 맞게 다섯 단계로 정리했습니다.
          위에서부터 차례로 읽으시면 용어가 자연스럽게 쌓입니다.
        </p>

        {COURSE.map((c) => (
          <div key={c.step} className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-[#C8743A] tracking-wide">{c.step}</span>
              <h2 className="font-serif text-lg font-bold text-[#1F3D34]">{c.title}</h2>
            </div>
            <p className="text-[15px] text-[#6B6661] leading-[1.8]">{c.desc}</p>
            <div className="flex flex-col gap-2">
              {c.slugs.map((s) => {
                const a = getArticle(s);
                if (!a) return null;
                return (
                  <Link key={s} href={`/guide/${s}`}>
                    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3 active:scale-[0.98] transition-all">
                      <p className="text-sm font-semibold text-[#1A1A18]">{a.title}</p>
                      <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{a.summary}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-3">읽다가 막히면</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          모르는 용어가 나오면 그때그때 찾아보시는 편이 빠릅니다. 용어 백과에 십성·오행·신살과
          일간·용신·대운 같은 핵심 개념 {TERMS.length}항목을 정리해 두었습니다. 삼재가 언제 드는지,
          내가 태어난 해의 간지가 무엇인지는 조견표에서 바로 확인하실 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dictionary" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">용어 백과</Link>
          <Link href="/reference/samjae" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">띠별 삼재표</Link>
          <Link href="/reference/ganji" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">띠·간지 조견표</Link>
          <Link href="/faq" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">자주 묻는 질문</Link>
        </div>

        <Link href="/free/saju" className="mt-2">
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
            <div>
              <p className="text-sm font-semibold text-white">직접 내 사주를 보면서 익히기</p>
              <p className="text-xs text-white/60 mt-0.5">생년월일로 무료 사주를 본 뒤 4단계 글을 함께 보시면 좋습니다</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8743A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
