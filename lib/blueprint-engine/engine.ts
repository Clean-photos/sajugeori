/**
 * engine.ts (blueprint 전용) — 정밀 절기 기반 사주 계산 어댑터.
 *
 * lib/saju-engine/engine.ts가 내보낸 순수 함수(간지 조합→십성·오행·신강·용신·신살·합충
 * 계산)는 그대로 재사용하고, 근사치였던 연주/월주 경계 판정과 대운수만 astro.ts의
 * 정밀 계산으로 새로 만든다. 2026-10-02부터 이 엔진이 전 상품의 유일한 명식 계산이다
 * (lib/saju-engine/index.ts의 buildChart가 이 함수로 위임 — 아래 CHART_ENGINE_VERSION 참고).
 * 이미 저장된 리포트는 재계산하지 않으므로 영향이 없다.
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
  KOREA_AVG_LONGITUDE, kstFieldsOf, parseSeoulWallClock, seoulOffsetMs,
} from "./astro";

/**
 * §(CoS 실물 확인, 2026-09-30 버그 수정 반영): 이 버전부터 진태양시 보정 후 시각을
 * KST 기준으로 정확히 읽는다(이전 버전은 UTC 접근자를 써 시주가 9시간 밀리고,
 * 자정 근접 출생은 일주까지 틀렸다). 이미 생성된 blueprint_reports는 저장된
 * content를 그대로 보여줄 뿐 재계산하지 않으므로 이 변경의 영향을 받지 않는다
 * — 이 값은 새로 생성되는 리포트에만 찍혀, 나중에 "이 리포트가 버그 수정 전/후
 * 어느 쪽으로 계산됐는지"를 구분하는 근거로 쓴다.
 */
/**
 * 2026-10-02(CoS 8·9차 A, CEO 확정): 이 엔진이 유료·무료 전 상품의 유일한 명식 계산이
 * 됐다(lib/saju-engine의 buildChart/runSajuEngine이 이 함수로 위임). 같은 시점에
 *  - 서머타임·옛 표준시(+8:30) 보정(IANA Asia/Seoul 오프셋) 적용,
 *  - 자시(진태양시 23:00~) 출생은 다음 날 일주로 계산,
 *  - 시각 모름(hasHour=false)은 정오로 놓고 날짜만으로 계산(자정 입력이 진태양시
 *    보정으로 전날로 밀리는 오류 방지).
 */
export const CHART_ENGINE_VERSION = "2026-10-02-unified";

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
  /** 이 명식이 어느 계산 로직 버전으로 만들어졌는지 — CHART_ENGINE_VERSION 참고 */
  chart_engine_version: string;
  /**
   * 출생 당시 서울 법정 시각의 UTC 오프셋(분). 540=표준(+9:00), 600=서머타임(+10:00),
   * 510=옛 표준시(+8:30) 등 — 화면이 "서머타임/옛 표준시를 반영했다"를 고지하는 근거.
   */
  legal_offset_minutes: number;
  /** 진태양시로 보정된 시계값("HH:MM") — 시각 모름이면 null. 고지 문구용. */
  solar_clock: string | null;
  /** 자시(진태양시 23:00~24:00) 출생이라 일주를 다음 날로 넘겨 계산했는가. */
  day_rolled_by_jasi: boolean;
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
  // 시각 모름은 정오로 놓는다 — 자정(00:00)을 그대로 쓰면 진태양시 보정(-30분 안팎)으로
  // 전날 23시대로 밀려 일주가 전날 것으로 계산된다(무료 상품은 전부 시각 없이 호출한다).
  const effectiveIso = hasHour ? birthIso : birthIso.replace(/T\d{2}:\d{2}(:\d{2})?/, "T12:00:00");

  // 절대 시각 확정(서머타임·옛 표준시 반영, 서버 타임존과 무관 — parseSeoulWallClock 문서 참고)
  // → 진태양시 보정 → +9 프레임 달력값으로 읽기.
  const instant = parseSeoulWallClock(effectiveIso);
  const legalOffsetMin = Math.round(seoulOffsetMs(instant.getTime()) / 60000);
  const corrected = trueSolarTime(instant, longitude);

  const kf = kstFieldsOf(corrected);
  const cy = kf.y;
  const ch = kf.h;
  // 자시(진태양시 23:00~): 일주를 다음 날로 넘긴다(9차 A-4, CEO 확정). 시주는 그 다음 날
  // 일간 기준의 子시를 쓴다. 시각을 모르면 해당 없음.
  const rolled = hasHour && ch >= 23;
  const dayDate = rolled ? new Date(Date.UTC(kf.y, kf.m - 1, kf.d + 1)) : new Date(Date.UTC(kf.y, kf.m - 1, kf.d));
  const dy = dayDate.getUTCFullYear(), dm = dayDate.getUTCMonth() + 1, dd = dayDate.getUTCDate();

  const baziYear = preciseBaziYear(corrected);
  const yPillar = calcPreciseYearPillar(baziYear);
  const { branch: mBranch } = preciseMonthBranch(corrected);
  const mStem = calcMonthStem(yPillar.stem, mBranch as Branch);
  const mPillar: Pillar = { stem: mStem, branch: mBranch as Branch };
  const dPillar = calcDayPillar(dy, dm, dd);

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
    chart_engine_version: CHART_ENGINE_VERSION,
    legal_offset_minutes: legalOffsetMin,
    solar_clock: hasHour ? `${String(ch).padStart(2, "0")}:${String(kf.min).padStart(2, "0")}` : null,
    day_rolled_by_jasi: rolled,
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
