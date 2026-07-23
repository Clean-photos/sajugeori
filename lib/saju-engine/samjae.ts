// 삼재(三災) 판정 — 태어난 해의 띠(년지)와 대상 연도만으로 계산하는 간이 신살.
// 개인 사주팔자 전체를 보는 대운·세운과는 층위가 다른 별개 체계다.
//
// 규칙: 년지가 속한 삼합의 첫 글자를 충(沖)하는 글자부터 3년이 삼재.
//   申子辰생 → 寅卯辰년 / 巳酉丑생 → 亥子丑년 / 寅午戌생 → 申酉戌년 / 亥卯未생 → 巳午未년
// 첫해=들삼재, 둘째=눌삼재, 셋째=날삼재.

import { BRANCHES, type Branch } from "./constants";

const PHASE = ["들삼재", "눌삼재", "날삼재"] as const;
export type SamjaePhase = (typeof PHASE)[number];

// 각 삼합 그룹(년지 index)과 그 그룹의 삼재 지지 3개(연도 순서 = 들·눌·날)
const SAMJAE_MAP: { group: number[]; samjae: number[] }[] = [
  { group: [8, 0, 4], samjae: [2, 3, 4] },   // 申子辰 → 寅卯辰
  { group: [5, 9, 1], samjae: [11, 0, 1] },  // 巳酉丑 → 亥子丑
  { group: [2, 6, 10], samjae: [8, 9, 10] }, // 寅午戌 → 申酉戌
  { group: [11, 3, 7], samjae: [5, 6, 7] },  // 亥卯未 → 巳午未
];

export interface SamjaeResult {
  isSamjae: boolean;
  phase: SamjaePhase | null;
  years: number[];          // 이번 삼재 주기의 3개 연도(삼재인 경우만)
  nextStartYear: number | null; // 삼재가 아닐 때, 다음 삼재가 시작되는 해
}

/** 들·눌·날 각 단계가 뜻하는 바 (리포트 설명용) */
export const PHASE_MEANING: Record<SamjaePhase, string> = {
  들삼재: "삼재가 들어서는 첫해",
  눌삼재: "삼재가 머무는 가운데 해",
  날삼재: "삼재가 물러나는 마지막 해",
};

/** 해당 연도의 지지 index (子=0). 갑자년(1984 등)이 子. */
function yearBranchIndex(year: number): number {
  return (((year - 4) % 12) + 12) % 12;
}

/**
 * @param yearBranch 태어난 해의 지지(년지). 예: 1991년생 → "未"
 * @param targetYear 판정 대상 연도. 예: 2026
 */
export function checkSamjae(yearBranch: Branch, targetYear: number): SamjaeResult {
  const bi = BRANCHES.indexOf(yearBranch);
  const entry = SAMJAE_MAP.find((e) => e.group.includes(bi));
  if (!entry) return { isSamjae: false, phase: null, years: [], nextStartYear: null };

  const pos = entry.samjae.indexOf(yearBranchIndex(targetYear));
  if (pos === -1) {
    // 삼재가 아니면 다음 들삼재가 오는 해를 찾는다(최대 12년 내에 반드시 있음).
    let next = targetYear + 1;
    while (yearBranchIndex(next) !== entry.samjae[0]) next++;
    return { isSamjae: false, phase: null, years: [], nextStartYear: next };
  }

  const startYear = targetYear - pos; // 들삼재 해
  return {
    isSamjae: true,
    phase: PHASE[pos],
    years: [startYear, startYear + 1, startYear + 2],
    nextStartYear: null,
  };
}
