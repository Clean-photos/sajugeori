/**
 * yearly-card.ts — 프리미엄 연운세 결과 최상단 요약 카드(12개월 흐름선형)의 데이터.
 *
 * CoS §C-2 ⑥ + 2026-09-22 살풀이 카드 정정과 같은 원칙: 월별 점수만 막대로 보여주면
 * "그래서 몇 월이 좋다는 건지" 한눈에 안 들어온다. scoreYear()가 이미 계산해 둔
 * MonthScore.note(합·충 등 근거를 담은 한국어 문장)에서 가장 좋은 달의 핵심 근거를
 * 뽑아 한 줄 결론을 만든다 — 새 주장을 짓지 않고 엔진이 이미 쓴 문구를 재사용한다.
 *
 * 순수 함수 — scoreYear()의 결과(YearlyResult)만 읽고 계산 엔진은 건드리지 않는다.
 */
import type { YearlyResult } from "@/lib/saju-engine/yearly";

export type MonthTier = "good" | "neutral" | "caution";

export interface YearlyCardMonth {
  month: number; // 1~12
  tier: MonthTier;
  /** 막대 높이용 0~1 정규화 값(그 해 12개월 중 최저~최고 기준). 절대 점수는 카드에 노출하지 않는다 */
  ratio: number;
}

export interface YearlyCardData {
  year: number;
  yearGanji: string;
  months: YearlyCardMonth[]; // 12개, 1월부터
  /** "1~2월 · 12월" 형태로 이미 묶여 있다 */
  goodMonthsLabel: string | null;
  cautionMonthsLabel: string | null;
  /** "3월은 협력·기회의 해입니다." 형태. 근거를 못 찾으면 null */
  verdict: string | null;
}

// scoreDate/scoreYear의 가중치 실측(±0.5~±6대) 기준 — 육합(+2.0)·충(-3.0) 한 번만 걸려도 넘는 선.
const GOOD_THRESHOLD = 2;
const CAUTION_THRESHOLD = -2;

/** [1,2,12] → "1~2월 · 12월" 처럼 연속 구간을 묶는다(12→1 넘어가는 연말연시 랩어라운드는 다루지 않는다) */
function formatMonthRanges(months: number[]): string | null {
  if (months.length === 0) return null;
  const sorted = [...months].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const m of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else ranges.push([m, m]);
  }
  return ranges.map(([a, b]) => (a === b ? `${a}월` : `${a}~${b}월`)).join(" · ");
}

/** 연운세 note 문자열(월/년 공용, "; "로 합쳐진 문장들)에서 "왜 좋은지" 한 구절을 뽑는다 */
function extractBenefit(noteJoined: string): string | null {
  const notes = noteJoined.split("; ");
  for (const kw of ["육합", "천간합", "삼합 계열"]) {
    const note = notes.find((n) => n.includes(kw));
    if (note) {
      const idx = note.indexOf("—");
      if (idx >= 0) return note.slice(idx + 1).trim();
    }
  }
  const supply = notes.find((n) => /용신 오행\([^)]+\) 공급/.test(n));
  const m = supply?.match(/용신 오행\(([^)]+)\) 공급/);
  if (m) return `필요한 기운(${m[1]})을 채워 주는 시기`;
  return null;
}

export function buildYearlyCard(result: YearlyResult): YearlyCardData {
  const scores = result.months.map((m) => m.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const span = hi - lo;

  const months: YearlyCardMonth[] = result.months.map((m) => ({
    month: m.month,
    tier: m.score >= GOOD_THRESHOLD ? "good" : m.score <= CAUTION_THRESHOLD ? "caution" : "neutral",
    ratio: span > 0 ? (m.score - lo) / span : 0.5,
  }));

  const goodMonthsLabel = formatMonthRanges(months.filter((m) => m.tier === "good").map((m) => m.month));
  const cautionMonthsLabel = formatMonthRanges(months.filter((m) => m.tier === "caution").map((m) => m.month));

  const best = [...result.months].sort((a, b) => b.score - a.score)[0];
  let verdict: string | null = null;
  if (best && best.score > 0) {
    const benefit = extractBenefit(best.note);
    if (benefit) verdict = `${best.month}월은 ${benefit}입니다.`;
  }

  return {
    year: result.year,
    yearGanji: result.yearGanji,
    months,
    goodMonthsLabel,
    cautionMonthsLabel,
    verdict,
  };
}
