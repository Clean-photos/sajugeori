import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ganjiTable, ipchunNote, yearGanji } from "../data";

const YEAR = new Date().getFullYear();
const FROM = 1940;
const TO = YEAR + 6;

export const metadata: Metadata = {
  title: `출생 연도별 띠·간지 조견표 (${FROM}~${TO}) | 사주거리`,
  description:
    `${FROM}년부터 ${TO}년까지 각 해의 육십갑자와 띠를 정리한 조견표입니다. 사주에서 해가 바뀌는 기준은 1월 1일이 아니라 입춘이므로, 연초 출생자의 띠가 갈리는 경우도 함께 표시했습니다.`,
  alternates: { canonical: "/reference/ganji" },
};

export default function GanjiTablePage() {
  const rows = ganjiTable(FROM, TO);
  const cur = yearGanji(YEAR);
  // 입춘 경계로 띠가 갈리는 해 (사실상 매년이지만 최근 몇 개만 예시로)
  const notes = [YEAR - 1, YEAR, YEAR + 1].map(ipchunNote).filter((n) => n.differs);

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
          출생 연도별 띠·간지 조견표
        </h1>
        <p className="relative text-sm text-white/60 mt-2">{FROM}~{TO}년 · 올해는 {cur.ganji}({cur.kr}) {cur.animal}의 해</p>
      </header>

      <section className="px-5 py-6 flex flex-col gap-4">
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          해마다 붙는 이름인 육십갑자(六十甲子)는 천간 열 글자와 지지 열두 글자가 순서대로
          짝을 이뤄 만들어집니다. 예순 개 조합이 한 바퀴 돌면 같은 이름이 다시 오는데,
          예순 해 만에 태어난 해의 간지가 돌아오는 것이 회갑(환갑)입니다.
          아래 표는 사주 계산 엔진으로 각 해의 간지를 산출한 것입니다.
        </p>

        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4">
          <p className="text-[14px] font-semibold text-[#8A5228] mb-1.5">연초에 태어나셨다면 꼭 확인하세요</p>
          <p className="text-[14px] text-[#6B6661] leading-relaxed">
            사주에서 해가 바뀌는 기준은 1월 1일이 아니라 <strong className="text-[#1A1A18]">입춘</strong>(대략 2월 4일)입니다.
            그래서 1월이나 2월 초에 태어난 사람은 달력상의 띠와 사주상의 띠가 다를 수 있습니다.
            {notes.length > 0 && (
              <> 예를 들어 {notes[0].year}년 1월생은 사주로는 {notes[0].beforeAnimal}띠({notes[0].beforeGanji})이고,
              같은 해 3월생은 {notes[0].afterAnimal}띠({notes[0].afterGanji})입니다.</>
            )}
          </p>
        </div>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">연도별 간지·띠</h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#1F3D34] text-white">
                <th className="text-left px-3 py-2.5 rounded-l-lg font-medium">연도</th>
                <th className="text-left px-3 py-2.5 font-medium">간지</th>
                <th className="text-left px-3 py-2.5 font-medium">띠</th>
                <th className="text-left px-3 py-2.5 rounded-r-lg font-medium">오행</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.year}
                  className={`${i % 2 ? "bg-[#FBF8F2]" : ""} ${r.year === YEAR ? "ring-1 ring-[#C8743A]/40" : ""}`}
                >
                  <td className="px-3 py-2 font-semibold text-[#1F3D34] whitespace-nowrap">
                    {r.year}
                    {r.year === YEAR && <span className="ml-1.5 text-[10px] text-[#C8743A]">올해</span>}
                  </td>
                  <td className="px-3 py-2 text-[#1A1A18] whitespace-nowrap">
                    {r.ganji} <span className="text-[11px] text-[#6B6661]">{r.kr}</span>
                  </td>
                  <td className="px-3 py-2 text-[#1A1A18] whitespace-nowrap">{r.animal}</td>
                  <td className="px-3 py-2 text-[#6B6661] whitespace-nowrap">{r.element}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">간지를 알면 무엇을 볼 수 있나요</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          태어난 해의 간지는 사주 네 기둥 중 첫 번째인 연주(年柱)가 됩니다. 연주는 조상과
          초년의 자리를 나타내고, 그 지지가 곧 띠입니다. 다만 사주 해석의 중심은 연주가 아니라
          태어난 날의 천간인 일간(日干)이므로, 띠만으로 사람을 판단하기는 어렵습니다.
          띠는 여덟 글자 중 한 글자일 뿐입니다.
        </p>

        <div className="flex flex-wrap gap-2 mt-1">
          <Link href="/reference/samjae" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">띠별 삼재표</Link>
          <Link href="/guide/60-ganji-cycle" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">60갑자 이야기</Link>
          <Link href="/dictionary/ilgan" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">일간</Link>
          <Link href="/faq" className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60">양력·음력 FAQ</Link>
        </div>

        <Link href="/free/saju" className="mt-2">
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
            <div>
              <p className="text-sm font-semibold text-white">내 사주 여덟 글자가 궁금하다면</p>
              <p className="text-xs text-white/60 mt-0.5">생년월일을 넣으면 절기 기준으로 자동 계산합니다</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8743A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>

        <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed mt-1">
          본 표는 사주 계산 엔진이 산출한 자료이며, 오락 및 참고 목적으로 제공됩니다.
        </div>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
