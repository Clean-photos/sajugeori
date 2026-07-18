import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CATEGORY_LABEL, TERMS, termsByCategory, type TermCategory } from "./terms";

export const metadata: Metadata = {
  title: "사주 용어 백과사전 | 사주거리",
  description:
    "사주·명리학 핵심 용어 30가지를 쉽게 풀어 쓴 백과사전. 십성(비견·겁재·식신·상관·정재·편재·정관·편관·정인·편인), 오행, 신살(도화살·역마살·천을귀인 등), 일간·용신·대운·세운 같은 개념을 한눈에.",
};

const ORDER: TermCategory[] = ["concept", "sipseong", "ohaeng", "sinsal"];

export default function DictionaryPage() {
  const grouped = termsByCategory();

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Dictionary</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">사주 용어 백과</h1>
        <p className="relative text-sm text-white/60 mt-1">명리학 핵심 용어 {TERMS.length}가지를 한 항목씩 풀이했어요</p>
      </header>

      <div className="px-5 pt-6">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 text-[13px] text-[#6B6661] leading-relaxed">
          사주를 처음 접하면 낯선 한자 용어에 가로막히기 쉽습니다. 자주 등장하는 개념들을
          하나씩, 예시와 함께 풀어 정리했어요. 궁금한 단어부터 골라 읽어 보세요.
        </div>
      </div>

      {ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items.length) return null;
        return (
          <section key={cat} className="px-4 pt-7">
            <div className="flex items-baseline gap-2 px-1 mb-3">
              <h2 className="font-serif text-lg font-bold text-[#1F3D34]">{CATEGORY_LABEL[cat]}</h2>
              <span className="text-xs text-[#6B6661]/70">{items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((t) => (
                <Link key={t.slug} href={`/dictionary/${t.slug}`}>
                  <article className="h-full bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 active:scale-[0.98] transition-all shadow-sm">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="font-semibold text-[15px] text-[#1F3D34]">{t.term}</h3>
                      {t.hanja && <span className="text-[11px] text-[#6B6661]/70">{t.hanja}</span>}
                    </div>
                    <p className="text-xs text-[#6B6661] mt-1.5 leading-snug line-clamp-3">{t.summary}</p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <div className="px-5 mt-8">
        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
          본 백과는 사주·명리학의 일반적인 개념을 소개하는 참고 자료이며, 오락 및 교양 목적으로 제공됩니다.
          개인의 중요한 결정은 해당 분야 전문가와 상담하시기 바랍니다.
        </div>
      </div>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
