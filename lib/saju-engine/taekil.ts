/**
 * taekil.ts — 택일(擇日) 엔진.
 * 기간 내 각 날짜의 일진(日辰)을 실제 계산해 내 사주와의 합충·용신 관계로 스코어링한다.
 * 무료 택일은 LLM이 날짜를 추정했지만, 프리미엄은 이 모듈의 실계산 결과를 근거로 쓴다.
 */

import * as C from "./constants";
import type { Element } from "./constants";
import { calcDayPillar, stemBranchKr } from "./engine";
import type { SajuChart } from "./engine";

export type TaekilPurpose = "wedding" | "move" | "business" | "travel" | "surgery" | "other";

export interface DayScore {
  date: string;          // "YYYY-MM-DD"
  weekday: string;       // "월"~"일"
  ganji: string;         // 예: "甲子(갑자)"
  score: number;
  notes: string[];       // 가감점 근거 (한국어, LLM 입력용)
  hasClash: boolean;     // 일지 충 여부 — 피해야 할 날 판단 기준
}

export interface TaekilResult {
  purpose: TaekilPurpose;
  range: { from: string; to: string };
  best: DayScore[];      // 점수 상위 (최길일 후보)
  avoid: DayScore[];     // 충 등으로 피해야 할 날
  criteria: string[];    // 이 사주에 적용된 택일 원칙 요약
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

/** 목적별 가중치 — 조화(합) 중시 vs 기운(용신) 중시 vs 안정(충 회피) 중시 */
const PURPOSE_WEIGHTS: Record<TaekilPurpose, { harmony: number; yongsin: number; clashPenalty: number }> = {
  wedding: { harmony: 1.4, yongsin: 1.0, clashPenalty: 1.2 },
  move:    { harmony: 1.0, yongsin: 1.1, clashPenalty: 1.3 },
  business:{ harmony: 1.0, yongsin: 1.4, clashPenalty: 1.0 },
  travel:  { harmony: 1.0, yongsin: 1.2, clashPenalty: 1.0 },
  surgery: { harmony: 0.8, yongsin: 1.0, clashPenalty: 1.5 },
  other:   { harmony: 1.0, yongsin: 1.0, clashPenalty: 1.0 },
};

function favorableElements(chart: SajuChart): Set<Element> {
  return new Set([...chart.yongsin.eokbu_candidates, ...chart.yongsin.johu_candidates]);
}

/** 과다 오행(평균의 1.6배 이상) — compatibility.ts와 동일 기준 */
function excessElements(chart: SajuChart): Set<Element> {
  const avg = Object.values(chart.elements).reduce((a, b) => a + b, 0) / 5;
  return new Set(
    (Object.entries(chart.elements) as [Element, number][])
      .filter(([, v]) => v >= avg * 1.6)
      .map(([e]) => e)
  );
}

/** 단일 날짜 스코어링 */
export function scoreDate(chart: SajuChart, y: number, m: number, d: number, purpose: TaekilPurpose = "other"): DayScore {
  const W = PURPOSE_WEIGHTS[purpose];
  const day = calcDayPillar(y, m, d);
  const notes: string[] = [];
  let score = 0;
  let hasClash = false;

  const myStem = chart.day_master;
  const myBranch = chart.pillars.day.branch;
  const yong = favorableElements(chart);
  const excess = excessElements(chart);

  // 1. 일진 오행 vs 용신/기신
  const dayStemEl = C.STEM_ELEMENT[day.stem];
  const dayBranchEl = C.BRANCH_ELEMENT[day.branch];
  for (const [el, label] of [[dayStemEl, "천간이"], [dayBranchEl, "지지가"]] as [Element, string][]) {
    if (yong.has(el)) {
      score += 2.0 * W.yongsin;
      notes.push(`일진 ${label} 용신 오행(${C.ELEMENT_KR[el]})을 공급`);
    } else if (excess.has(el)) {
      score -= 1.5 * W.yongsin;
      notes.push(`일진 ${label} 과다 오행(${C.ELEMENT_KR[el]})을 가중`);
    }
  }

  // 2. 일진 천간 vs 내 일간
  const stemKey = [myStem, day.stem].sort().join("");
  if (C.STEM_COMBINE.has(stemKey)) {
    score += 1.5 * W.harmony;
    notes.push(`일진 천간과 천간합(${C.STEM_KR[myStem]}${C.STEM_KR[day.stem]}합) — 순조로운 기운`);
  } else if (C.STEM_CLASH_PAIRS.has(stemKey)) {
    score -= 2.0 * W.clashPenalty;
    notes.push(`일진 천간과 천간충 — 마찰·번복 주의`);
  }

  // 3. 일진 지지 vs 내 일지
  const branchKey = [myBranch, day.branch].sort().join("");
  if (C.BRANCH_SIX_COMBINE.has(branchKey)) {
    score += 2.5 * W.harmony;
    notes.push(`일진 지지와 육합(${C.BRANCH_KR[myBranch]}${C.BRANCH_KR[day.branch]}합) — 일이 잘 묶이는 날`);
  } else if (C.BRANCH_CLASH_PAIRS.has(branchKey)) {
    score -= 4.0 * W.clashPenalty;
    hasClash = true;
    notes.push(`일진 지지와 충(${C.BRANCH_KR[myBranch]}${C.BRANCH_KR[day.branch]}충) — 변동·사고수, 피할 날`);
  } else if (C.BRANCH_HARM_PAIRS.has(branchKey)) {
    score -= 1.5 * W.clashPenalty;
    notes.push(`일진 지지와 해(害) — 은근한 방해 가능`);
  } else {
    for (const { trio, element } of C.BRANCH_THREE_COMBINE) {
      if (myBranch !== day.branch && trio.includes(myBranch) && trio.includes(day.branch)) {
        score += 1.5 * W.harmony;
        notes.push(`일진 지지와 삼합 계열(${C.ELEMENT_KR[element]}국) — 협력 기운`);
        break;
      }
    }
  }

  // 4. 복음일(내 일주와 동일한 간지) — 기운이 겹쳐 정체되기 쉬움
  if (day.stem === myStem && day.branch === myBranch) {
    score -= 1.0;
    notes.push(`복음일(내 일주와 동일) — 새 일 시작엔 답답할 수 있음`);
  }

  const dateObj = new Date(y, m - 1, d);
  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    weekday: WEEKDAY_KR[dateObj.getDay()],
    ganji: stemBranchKr(day.stem, day.branch),
    score: Math.round(score * 100) / 100,
    notes,
    hasClash,
  };
}

/** 기간 내 날짜들을 스코어링해 최길일/피할 날을 추린다. 기간은 최대 120일. */
export function rankDates(
  chart: SajuChart,
  from: string,          // "YYYY-MM-DD"
  to: string,            // "YYYY-MM-DD"
  purpose: TaekilPurpose = "other",
  topN = 5
): TaekilResult {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const dayMs = 86_400_000;
  const span = Math.min(120, Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1));

  const all: DayScore[] = [];
  for (let i = 0; i < span; i++) {
    const cur = new Date(start.getTime() + i * dayMs);
    all.push(scoreDate(chart, cur.getFullYear(), cur.getMonth() + 1, cur.getDate(), purpose));
  }

  const best = [...all].sort((a, b) => b.score - a.score).slice(0, topN).filter((s) => s.score > 0);
  const avoid = all.filter((s) => s.hasClash).sort((a, b) => a.score - b.score).slice(0, topN);

  const yong = [...favorableElements(chart)].map((e) => C.ELEMENT_KR[e]);
  const criteria = [
    `용신 오행(${yong.join("·")})의 기운이 실린 일진을 우선`,
    `내 일지(${C.BRANCH_KR[chart.pillars.day.branch]})와 합이 되는 날 가점, 충이 되는 날 배제`,
    `목적(${purpose})에 맞는 가중치 적용`,
  ];

  return { purpose, range: { from, to }, best, avoid, criteria };
}
