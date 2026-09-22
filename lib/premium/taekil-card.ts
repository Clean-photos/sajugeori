/**
 * taekil-card.ts — 프리미엄 택일 결과 최상단 요약 카드(달력형)의 데이터.
 *
 * CoS §C-2 ⑤ + 2026-09-22 살풀이 카드 정정과 같은 원칙: 날짜·간지·점수만 나열하면
 * "그래서 이 날이 왜 좋은데?"에 답을 못 한다. rankDates()가 이미 계산해 둔 DayScore.notes
 * (합·충 등 판단 근거를 한국어 문장으로 담고 있다)에서 1위 날짜의 핵심 근거를 뽑아
 * 한 줄 결론을 만든다 — 새 주장을 짓지 않고 엔진이 이미 쓴 문구를 재사용한다.
 *
 * 순수 함수 — rankDates()의 결과(TaekilResult)만 읽고 계산 엔진은 건드리지 않는다.
 */
import type { DayScore, TaekilResult } from "@/lib/saju-engine/taekil";

export interface TaekilCardDate {
  /** "10-01" — 연도는 카드에 담지 않는다(개인정보는 아니지만 카드 목적상 불필요) */
  mmdd: string;
  weekday: string;
  /** 예: "戊申(무신)" — DayScore.ganji 그대로 */
  ganji: string;
  /** 1~5. 1위는 항상 5 */
  stars: number;
  /** "합"·"삼합"·"용신"·"무난" — 왜 좋은 날인지 한눈에 보이는 짧은 태그 */
  tag: string;
}

export interface TaekilCardData {
  purposeLabel: string;
  top: TaekilCardDate[]; // 최대 3
  /** "09-24" 형태, 최대 3 */
  avoid: string[];
  /** "10월 1일(목)은 일이 잘 묶이는 날입니다." 형태. 근거를 못 찾으면 null */
  verdict: string | null;
}

/** 1위 근거 후보를 우선순위대로 찾아 "왜 좋은지" 짧은 태그로 축약한다 */
function extractTag(notes: string[]): string {
  if (notes.some((n) => n.includes("육합") || n.includes("천간합"))) return "합";
  if (notes.some((n) => n.includes("삼합 계열"))) return "삼합";
  if (notes.some((n) => /용신 오행\([^)]+\)을 공급/.test(n))) return "용신";
  return "무난";
}

/** notes에서 사람이 읽을 수 있는 "왜 좋은 날인지" 한 문구를 뽑는다. 못 찾으면 null */
function extractBenefit(notes: string[]): string | null {
  // 우선순위: 지지 육합(가중치 2.5) > 천간합(1.5) > 삼합 계열(1.5) — 전부 "— 문구" 형태로
  // 엔진이 이미 사람이 읽을 문장을 만들어 뒀다(scoreDate 참고). 그대로 재사용한다.
  for (const kw of ["육합", "천간합", "삼합 계열"]) {
    const note = notes.find((n) => n.includes(kw));
    if (note) {
      const idx = note.indexOf("—");
      if (idx >= 0) return note.slice(idx + 1).trim();
    }
  }
  // 합 계열이 없으면 용신 오행 공급(대시 없는 템플릿)에서 직접 문구를 만든다
  const supply = notes.find((n) => /용신 오행\([^)]+\)을 공급/.test(n));
  const m = supply?.match(/용신 오행\(([^)]+)\)을 공급/);
  if (m) return `필요한 기운(${m[1]})을 채워 주는 날`;
  return null;
}

function starsFor(d: DayScore, topScore: number): number {
  if (topScore <= 0) return 3;
  const ratio = d.score / topScore;
  return Math.min(5, Math.max(3, Math.round(ratio * 5)));
}

export function buildTaekilCard(result: TaekilResult, purposeLabel: string): TaekilCardData {
  const top = result.best.slice(0, 3);
  const topScore = top[0]?.score ?? 0;

  const cardTop: TaekilCardDate[] = top.map((d) => ({
    mmdd: d.date.slice(5),
    weekday: d.weekday,
    ganji: d.ganji,
    stars: starsFor(d, topScore),
    tag: extractTag(d.notes),
  }));

  const avoid = result.avoid.slice(0, 3).map((d) => d.date.slice(5));

  let verdict: string | null = null;
  if (top[0]) {
    const benefit = extractBenefit(top[0].notes);
    if (benefit) {
      const [mm, dd] = top[0].date.slice(5).split("-").map(Number);
      verdict = `${mm}월 ${dd}일(${top[0].weekday})은 ${benefit}입니다.`;
    }
  }

  return { purposeLabel, top: cardTop, avoid, verdict };
}
