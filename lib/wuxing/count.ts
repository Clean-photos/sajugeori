/**
 * count.ts — 오행 보완 리포트 §8: 표면 계수 / 지장간 계수 이중 산출.
 *
 * 왜 새로 만드는가: 엔진의 `elementDistribution()`은 이미 지장간을 가중 포함하지만,
 * 반환값이 **개수가 아니라 가중 점수**다(지지 본기 1.0 + 다른 오행 지장간 weight×0.8라
 * 합계가 8이 아니라 9.6~9.8이 된다). 리포트에 "水 1.16개"로 찍으면 틀리므로, 8글자를
 * 그대로 세는 표면 계수를 별도로 둔다.
 *
 * 계산 엔진 무접촉(하드룰 1) — `lib/saju-engine/`은 읽기만 한다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element, Stem, Branch } from "@/lib/saju-engine/constants";
import type { SajuChart, Pillar } from "@/lib/saju-engine/engine";

/** 지지 안에 숨어 있는 오행 1건 — "겉으로는 0개지만 진토(辰) 안에 계수(癸)가 있다" 서술용 */
export interface HiddenHit {
  /** 숨어 있던 지지 */
  branch: Branch;
  /** 그 지지의 한글 표기 (진) */
  branchKr: string;
  /** 숨어 있던 천간 */
  stem: Stem;
  /** 그 천간의 한글 표기 (계) */
  stemKr: string;
  /** 지장간 가중치 (본기일수록 큼) */
  weight: number;
}

export interface ElementCount {
  /** 표면 계수 — 천간·지지 글자를 1개씩 그대로 센다. 합계 = 8 (시주 없으면 6) */
  surface: Record<Element, number>;
  /** 엔진 가중 계수 — `elementDistribution()` 원본값. 개수가 아니라 점수다 */
  weighted: Record<Element, number>;
  /** 표면엔 없지만 지장간에 숨어 있는 오행 → 그 근거 목록 */
  hidden: Record<Element, HiddenHit[]>;
  /** 계수에 쓰인 글자 수 (8 또는 6) */
  charCount: number;
  /** 시주 포함 여부 — false면 두 글자가 비어 판정 정밀도가 떨어진다(§2 극단형 판정 보류 근거) */
  hasHour: boolean;
}

function emptyCount(): Record<Element, number> {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
}

function emptyHidden(): Record<Element, HiddenHit[]> {
  return { 木: [], 火: [], 土: [], 金: [], 水: [] };
}

/** 차트에서 실제로 존재하는 기둥만 배열로 (시주는 없을 수 있다) */
export function pillarList(chart: SajuChart): Pillar[] {
  const { year, month, day, hour } = chart.pillars;
  return hour ? [year, month, day, hour] : [year, month, day];
}

/**
 * 표면 계수 + 지장간 근거를 함께 낸다.
 *
 * `hidden`에는 **표면 계수가 0인 오행만** 담는다. 표면에 이미 있는 오행의 지장간까지
 * 모으면 리포트에서 "숨어 있습니다"라는 서술이 무의미해지기 때문이다.
 */
export function countElements(chart: SajuChart): ElementCount {
  const pillars = pillarList(chart);
  const surface = emptyCount();

  for (const { stem, branch } of pillars) {
    surface[C.STEM_ELEMENT[stem]] += 1;
    surface[C.BRANCH_ELEMENT[branch]] += 1;
  }

  const hidden = emptyHidden();
  for (const el of C.ELEMENTS) {
    if (surface[el] > 0) continue; // 표면에 있으면 "숨어 있다"가 성립하지 않는다
    for (const { branch } of pillars) {
      for (const [hs, w] of C.HIDDEN_STEMS[branch]) {
        if (C.STEM_ELEMENT[hs] !== el) continue;
        hidden[el].push({
          branch,
          branchKr: C.BRANCH_KR[branch],
          stem: hs,
          stemKr: C.STEM_KR[hs],
          weight: w,
        });
      }
    }
    // 본기(가중치 큰 것) 우선으로 보여 준다 — 근거가 강한 것부터
    hidden[el].sort((a, b) => b.weight - a.weight);
  }

  return {
    surface,
    weighted: chart.elements,
    hidden,
    charCount: pillars.length * 2,
    hasHour: chart.has_hour,
  };
}

/** 표면 0개지만 지장간에는 있는가 — "완전 부재"와 "겉으로만 없음"을 가르는 판정 */
export function isHiddenOnly(count: ElementCount, el: Element): boolean {
  return count.surface[el] === 0 && count.hidden[el].length > 0;
}

/** 표면·지장간 모두 없는 진짜 부재 */
export function isTrulyAbsent(count: ElementCount, el: Element): boolean {
  return count.surface[el] === 0 && count.hidden[el].length === 0;
}
