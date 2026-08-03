import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ZODIACS, yearGanji, samjaeOfYear, samjaeCycles } from "../data";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `${YEAR}년 삼재 띠 총정리 — 띠별 삼재 연도 조견표 | 사주거리`,
  description:
    `${YEAR}년에 삼재가 드는 띠와 들삼재·눌삼재·날삼재 단계를 정리했습니다. 열두 띠 각각이 앞으로 언제 삼재를 맞는지 연도까지 계산한 조견표를 함께 제공합니다.`,
  alternates: { canonical: "/reference/samjae" },
};

export default function SamjaeTablePage() {
  const g = yearGanji(YEAR);
  const thisYear = samjaeOfYear(YEAR);
  const cycles = samjaeCycles(YEAR, 3);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Reference</p>
        <h1 className="relative font-serif text-[26px] font-bold text-white leading-tight">
          {YEAR}년 삼재 띠와 띠별 삼재 연도표
        </h1>
        <p className="relative text-sm text-white/60 mt-2">{YEAR}년은 {g.ganji}({g.kr})년 · {g.animal}의 해</p>
      </header>

      <section className="px-5 py-6 flex flex-col gap-4">
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          삼재(三災)는 아홉 해에 한 번 찾아와 세 해 동안 머무는 흐름입니다. 태어난 해의 띠가
          속한 삼합(三合)을 기준으로 정해지며, 삼합의 첫 글자를 충(沖)하는 해부터 3년이
          삼재에 해당합니다. 아래 표는 사주 계산 엔진으로 각 띠의 삼재 연도를 직접 산출한
          것입니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">{YEAR}년에 삼재가 드는 띠</h2>
        {thisYear.length > 0 ? (
          <div className="flex flex-col gap-2">
            {thisYear.map((r) => (
              <div key={r.branch} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-[#1F3D34]">
                    {r.animal}띠 <span className="text-xs font-normal text-[#6B6661]">({r.kr}·{r.branch})</span>
                  </p>
                  <p className="text-xs text-[#6B6661] mt-0.5">{r.years[0]}년 ~ {r.years[2]}년 삼재</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#C8743A]/12 text-[#8A5228]">
                  {r.phase}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-[#1A1A18]">올해는 삼재가 드는 띠가 없습니다.</p>
        )}

        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          삼재 3년은 각각 이름이 다릅니다. 첫해가 들삼재(入三災)로 삼재가 들어서는 해,
          둘째 해가 눌삼재(枕三災)로 머무는 해, 셋째 해가 날삼재(出三災)로 물러나는 해입니다.
          어느 해가 가장 무거운지는 견해가 갈립니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">열두 띠 삼재 연도 조견표</h2>
        <p className="text-[13px] text-[#6B6661] leading-relaxed">
          {YEAR}년 기준으로 각 띠에 앞으로 찾아올 삼재 주기를 계산했습니다.
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#1F3D34] text-white">
                <th className="text-left px-3 py-2.5 rounded-l-lg font-medium">띠</th>
                <th className="text-left px-3 py-2.5 font-medium">삼재 드는 해</th>
                <th className="text-left px-3 py-2.5 rounded-r-lg font-medium">다음 주기</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((z, i) => (
                <tr key={z.branch} className={i % 2 ? "bg-[#FBF8F2]" : ""}>
                  <td className="px-3 py-2.5 font-semibold text-[#1F3D34] whitespace-nowrap">
                    {z.animal}띠
                    <span className="ml-1 text-[11px] font-normal text-[#6B6661]">{z.kr}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[#1A1A18] whitespace-nowrap">
                    {z.cycles[0] ? `${z.cycles[0].years[0]}~${z.cycles[0].years[2]}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[#6B6661] whitespace-nowrap">
                    {z.cycles[1] ? `${z.cycles[1].years[0]}~${z.cycles[1].years[2]}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">삼재는 어떻게 정해지나요</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          열두 띠는 넷씩 묶여 삼합을 이룹니다. 원숭이·쥐·용(신자진)은 물의 무리,
          뱀·닭·소(사유축)는 쇠의 무리, 호랑이·말·개(인오술)는 불의 무리,
          돼지·토끼·양(해묘미)은 나무의 무리입니다. 같은 무리에 속한 세 띠는 삼재도 함께 듭니다.
          위 표에서 세 띠씩 같은 연도가 묶이는 것도 이 때문입니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">과하게 두려워할 개념은 아닙니다</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          삼재는 아홉 해 중 세 해, 즉 인생의 삼분의 일에 해당합니다. 누구에게나 주기적으로
          돌아오는 흐름이라는 뜻이기도 합니다. 또한 태어난 해 하나만으로 판정하는 개념이라,
          생년월일시 전체로 보는 사주팔자나 대운과는 층위가 다릅니다. 같은 삼재 해라도
          그 사람의 사주와 대운에 따라 실제 흐름은 크게 달라집니다.
        </p>

        <div className="flex flex-wrap gap-2 mt-1">
          <Link href="/dictionary/samjae" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">삼재 자세히</Link>
          <Link href="/reference/ganji" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">연도별 간지표</Link>
          <Link href="/dictionary/daeun" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">대운</Link>
        </div>

        <Link href="/free/saju" className="mt-2">
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
            <div>
              <p className="text-sm font-semibold text-white">내 사주는 올해 어떤 흐름일까</p>
              <p className="text-xs text-white/60 mt-0.5">생년월일로 무료 사주 보기 — 삼재 여부도 함께 안내합니다</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8743A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>

        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed mt-1">
          본 표는 사주 계산 엔진이 산출한 자료이며, 오락 및 참고 목적으로 제공됩니다.
          개인의 중요한 결정은 해당 분야 전문가와 상담하시기 바랍니다.
        </div>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
