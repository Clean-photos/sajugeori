/**
 * yearly.ts — 연운세(年運) 세운(歲運) 엔진.
 * 그 해의 간지(세운)와 12개월 월운(月運)을 내 사주의 용신·일간·일지와 대조해 스코어링한다.
 * 무료 연운세는 대운(大運)만 참조했지만, 프리미엄은 해당 연도 자체의 기운을 실제 계산한다.
 */

import * as C from "./constants";
import type { Element, Stem, Branch } from "./constants";
import { calcYearPillar, calcMonthStem, stemBranchKr } from "./engine";
import type { SajuChart } from "./engine";

export interface MonthScore {
  month: number;      // 1~12 (양력 절기 기준 근사)
  ganji: string;
  score: number;
  note: string;
}

export interface YearlyResult {
  year: number;
  yearGanji: string;
  yearScore: number;
  yearNotes: string[];
  daewoon: { ganji: string; ageRange: string; favorability: string } | null;
  months: MonthScore[];
}

function favorableElements(chart: SajuChart): Set<Element> {
  return new Set([...chart.yongsin.eokbu_candidates, ...chart.yongsin.johu_candidates]);
}

function excessElements(chart: SajuChart): Set<Element> {
  const avg = Object.values(chart.elements).reduce((a, b) => a + b, 0) / 5;
  return new Set(
    (Object.entries(chart.elements) as [Element, number][])
      .filter(([, v]) => v >= avg * 1.6).map(([e]) => e)
  );
}

/** 천간·지지 오행이 용신이면 가점, 기신(과다)이면 감점 */
function elementScore(stemEl: Element, branchEl: Element, yong: Set<Element>, excess: Set<Element>, notes: string[]): number {
  let s = 0;
  for (const [el, label] of [[stemEl, "천간이"], [branchEl, "지지가"]] as [Element, string][]) {
    if (yong.has(el)) { s += 2.0; notes.push(`${label} 용신 오행(${C.ELEMENT_KR[el]}) 공급`); }
    else if (excess.has(el)) { s -= 1.5; notes.push(`${label} 과다 오행(${C.ELEMENT_KR[el]}) 가중`); }
  }
  return s;
}

/** 세운 간지와 내 일간·일지의 합충 */
function interactionScore(chart: SajuChart, stem: Stem, branch: Branch, notes: string[]): number {
  let s = 0;
  const myStem = chart.day_master;
  const myBranch = chart.pillars.day.branch;

  const stemKey = [myStem, stem].sort().join("");
  if (C.STEM_COMBINE.has(stemKey)) { s += 1.2; notes.push(`일간과 천간합 — 협력·기회의 해`); }
  else if (C.STEM_CLASH_PAIRS.has(stemKey)) { s -= 1.5; notes.push(`일간과 천간충 — 변동·갈등 주의`); }

  const branchKey = [myBranch, branch].sort().join("");
  if (C.BRANCH_SIX_COMBINE.has(branchKey)) { s += 2.0; notes.push(`일지와 육합 — 안정·결실의 해`); }
  else if (C.BRANCH_CLASH_PAIRS.has(branchKey)) { s -= 3.0; notes.push(`일지와 충 — 이동·변화·건강 주의`); }
  else if (C.BRANCH_HARM_PAIRS.has(branchKey)) { s -= 1.2; notes.push(`일지와 해(害) — 은근한 소모`); }
  else {
    for (const { trio, element } of C.BRANCH_THREE_COMBINE) {
      if (myBranch !== branch && trio.includes(myBranch) && trio.includes(branch)) {
        s += 1.2; notes.push(`일지와 삼합 계열(${C.ELEMENT_KR[element]}국) — 협력 기운`);
        break;
      }
    }
  }
  return s;
}

/** 특정 연도의 세운을 스코어링 */
export function scoreYear(chart: SajuChart, year: number): YearlyResult {
  const yong = favorableElements(chart);
  const excess = excessElements(chart);

  // 연 간지 (입춘 기준 — 연중 날짜로 안전하게 취득)
  const yp = calcYearPillar(year, 6, 15);
  const yearNotes: string[] = [];
  let yearScore = 0;
  yearScore += elementScore(C.STEM_ELEMENT[yp.stem], C.BRANCH_ELEMENT[yp.branch], yong, excess, yearNotes);
  yearScore += interactionScore(chart, yp.stem, yp.branch, yearNotes);

  // 포함 대운 찾기
  const birthYear = new Date(chart.birth_iso).getFullYear();
  const age = year - birthYear;
  const dw = chart.daewoon.list.find((d) => age >= d.start_age && age <= d.end_age) ?? null;
  let daewoon: YearlyResult["daewoon"] = null;
  if (dw) {
    const dwEl = C.BRANCH_ELEMENT[dw.branch];
    const fav = yong.has(dwEl) ? "유리" : excess.has(dwEl) ? "부담" : "무난";
    daewoon = { ganji: dw.ganji, ageRange: `${dw.start_age}~${dw.end_age}세`, favorability: fav };
  }

  // 12개월 월운 (寅월=양력 2월 시작 근사, 월지 고정 순서)
  const months: MonthScore[] = [];
  for (let i = 0; i < 12; i++) {
    const mBranch = C.MONTH_BRANCH_ORDER[i];
    const mStem = calcMonthStem(yp.stem, mBranch);
    const mNotes: string[] = [];
    let mScore = 0;
    mScore += elementScore(C.STEM_ELEMENT[mStem], C.BRANCH_ELEMENT[mBranch], yong, excess, mNotes);
    mScore += interactionScore(chart, mStem, mBranch, mNotes);
    // 寅월(index0)이 대략 양력 2월 → 표기용 월 번호
    const calMonth = ((i + 1) % 12) + 1;
    months.push({
      month: calMonth,
      ganji: stemBranchKr(mStem, mBranch),
      score: Math.round(mScore * 100) / 100,
      note: mNotes.join("; ") || "무난",
    });
  }
  months.sort((a, b) => a.month - b.month);

  return {
    year,
    yearGanji: stemBranchKr(yp.stem, yp.branch),
    yearScore: Math.round(yearScore * 100) / 100,
    yearNotes,
    daewoon,
    months,
  };
}
