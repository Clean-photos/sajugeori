/**
 * engine.ts (blueprint 전용) — 정밀 절기 기반 사주 계산 어댑터.
 *
 * 격리 조건: lib/saju-engine/engine.ts는 한 줄도 수정하지 않는다. 그 파일이
 * 이미 내보낸 순수 함수(간지 조합→십성·오행·신강·용신·신살·합충 계산)는
 * 그대로 재사용하고, 근사치였던 연주/월주 경계 판정과 대운수만 astro.ts의
 * 정밀 계산으로 새로 만든다. 기존 6종 리포트가 쓰는 계산 경로는 전혀
 * 건드리지 않으므로, 기존 캐시·이미 판매된 리포트에 영향이 없다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Stem, Branch } from "@/lib/saju-engine/constants";
import {
  calcMonthStem, calcDayPillar, calcHourPillar,
  tenGod, branchTenGod, elementDistribution, twelveStage,
  strengthAssessment, calcYongsin, detectSal, detectInteractions,
  stemBranchKr,
} from "@/lib/saju-engine/engine";
import type { Pillar, Pillars, SajuChart } from "@/lib/saju-engine/engine";
import {
  trueSolarTime, preciseMonthBranch, preciseBaziYear, preciseDaysToAdjacentTerm,
  KOREA_AVG_LONGITUDE,
} from "./astro";

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export interface PreciseDaewoonEntry {
  index: number;
  start_age: number;
  end_age: number;
  start_year: number;
  stem: Stem;
  branch: Branch;
  ganji: string;
}

export interface PreciseDaewoon {
  direction: string;
  forward: boolean;
  start_age: number;
  start_age_days: number; // 대운수 산출 근거 일수(진태양시 보정 후 정밀 절기까지의 실제 일수)
  list: PreciseDaewoonEntry[];
}

export interface BlueprintChart extends SajuChart {
  /** 진태양시 보정으로 실제 사용된 시각(KST, 보정 후) */
  corrected_birth_iso: string;
  /** 보정에 쓴 근사 경도(°E) — 출생지 미수집이라 전국 평균(서울)을 고정 사용 */
  longitude_used: number;
  /** engine.ts의 근사 대운 대신, 정밀 절기 기반으로 재계산한 대운 */
  precise_daewoon: PreciseDaewoon;
}

function calcPreciseYearPillar(baziYear: number): Pillar {
  return { stem: C.STEMS[mod(baziYear - 4, 10)], branch: C.BRANCHES[mod(baziYear - 4, 12)] };
}

function calcPreciseDaewoon(
  yearStem: Stem, monthPillar: Pillar, gender: string,
  correctedDate: Date, birthYear: number, count = 9
): PreciseDaewoon {
  const yearYang = C.STEM_YINYANG[yearStem] === "+";
  const isMale = gender.toUpperCase() === "M";
  const forward = (yearYang && isMale) || (!yearYang && !isMale);
  const direction = forward ? "순행(順行)" : "역행(逆行)";

  const days = preciseDaysToAdjacentTerm(correctedDate, forward);
  // 대운수 = 절기까지 일수 / 3, 관례상 반올림하되 최소 1
  const startAge = Math.max(1, Math.round(days / 3));

  const mStemIdx = C.STEMS.indexOf(monthPillar.stem);
  const mBranchIdx = C.BRANCHES.indexOf(monthPillar.branch);
  const list: PreciseDaewoonEntry[] = [];
  for (let i = 1; i <= count; i++) {
    const s = forward ? C.STEMS[mod(mStemIdx + i, 10)] : C.STEMS[mod(mStemIdx - i, 10)];
    const b = forward ? C.BRANCHES[mod(mBranchIdx + i, 12)] : C.BRANCHES[mod(mBranchIdx - i, 12)];
    const age = startAge + (i - 1) * 10;
    list.push({ index: i, start_age: age, end_age: age + 9, start_year: birthYear + age, stem: s, branch: b, ganji: stemBranchKr(s, b) });
  }
  return { direction, forward, start_age: startAge, start_age_days: Math.round(days * 10) / 10, list };
}

/**
 * 정밀 사주 차트를 만든다. birthIso는 온보딩에서 받은 KST 벽시계 시각으로 간주한다
 * (진태양시 보정은 이 함수 안에서 적용하며, 호출부에서 미리 보정하면 안 된다).
 */
export function buildPreciseChart(birthIso: string, gender: string, hasHour = true, longitude = KOREA_AVG_LONGITUDE): BlueprintChart {
  const kstDate = new Date(birthIso);
  const corrected = trueSolarTime(kstDate, longitude);

  const cy = corrected.getUTCFullYear(), cm = corrected.getUTCMonth() + 1, cd = corrected.getUTCDate();
  const ch = corrected.getUTCHours();

  const baziYear = preciseBaziYear(corrected);
  const yPillar = calcPreciseYearPillar(baziYear);
  const { branch: mBranch } = preciseMonthBranch(corrected);
  const mStem = calcMonthStem(yPillar.stem, mBranch as Branch);
  const mPillar: Pillar = { stem: mStem, branch: mBranch as Branch };
  const dPillar = calcDayPillar(cy, cm, cd);

  const pillarsList: Pillar[] = [yPillar, mPillar, dPillar];
  const pillars: Pillars = { year: yPillar, month: mPillar, day: dPillar, hour: null };
  if (hasHour) {
    const hPillar = calcHourPillar(dPillar.stem, ch);
    pillars.hour = hPillar;
    pillarsList.push(hPillar);
  }

  const posNames = ["year", "month", "day", "hour"];
  const tg: Record<string, string> = {};
  for (let i = 0; i < pillarsList.length; i++) {
    const { stem, branch } = pillarsList[i];
    tg[`${posNames[i]}_stem`] = posNames[i] === "day" ? "일간(본원)" : C.TEN_GOD_KR[tenGod(dPillar.stem, stem)];
    tg[`${posNames[i]}_branch`] = C.TEN_GOD_KR[branchTenGod(dPillar.stem, branch)];
  }

  const stages: Record<string, string> = {};
  for (let i = 0; i < pillarsList.length; i++)
    stages[posNames[i]] = C.TWELVE_STAGES_KR[twelveStage(dPillar.stem, pillarsList[i].branch)];

  const strength = strengthAssessment(dPillar.stem, pillarsList, mBranch as Branch);
  const ys = calcYongsin(dPillar.stem, pillarsList, mBranch as Branch, strength);
  const dw = calcPreciseDaewoon(yPillar.stem, mPillar, gender, corrected, cy);
  const sal = detectSal(pillarsList);
  const inter = detectInteractions(pillarsList);
  const elems = elementDistribution(pillarsList);

  return {
    birth_iso: birthIso,
    corrected_birth_iso: corrected.toISOString(),
    longitude_used: longitude,
    gender,
    has_hour: hasHour,
    pillars,
    day_master: dPillar.stem,
    day_master_element: C.STEM_ELEMENT[dPillar.stem],
    ten_gods: tg,
    elements: elems,
    strength,
    yongsin: ys,
    daewoon: dw as unknown as SajuChart["daewoon"], // 레거시 필드 호환용 별칭(실사용은 precise_daewoon)
    precise_daewoon: dw,
    sal,
    interactions: inter,
    twelve_stages: stages,
  };
}
