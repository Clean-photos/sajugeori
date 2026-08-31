/**
 * seun.ts — 오행 보완 리포트 §7: 3년 세운 래퍼.
 *
 * ⚠️ 엔진의 `scoreYear()`를 쓰지 않는다. 그쪽은 길흉 점수 엔진이라 yearNotes가
 * "일지와 충 — 이동·변화·건강 주의", "일간과 천간합 — 협력·기회의 해" 같은 **사건
 * 뉘앙스 문구**를 낸다. 이 상품은 사건 예측 금지(§1)이므로 그대로 쓰면 운명 설계도를
 * 잠식한다. 여기서는 **간지와 그 오행만** 취하고 점수·문구는 버린다.
 *
 * 계산 엔진 무접촉(하드룰 1) — `calcYearPillar`만 읽기로 호출한다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element, Stem, Branch } from "@/lib/saju-engine/constants";
import { calcYearPillar } from "@/lib/saju-engine/engine";
import type { SajuChart } from "@/lib/saju-engine/engine";
import type { Classification } from "./classify";

/** 세운 1년치 — 그 해에 들어오는 기운만 담는다. 길흉·사건 판단 없음 */
export interface SeunYear {
  year: number;
  stem: Stem;
  branch: Branch;
  /** "丙午(병오)" */
  ganji: string;
  stemElement: Element;
  branchElement: Element;
  /** 그 해가 밀어넣는 오행 가중 (천간 1 + 지지 1) */
  incoming: Partial<Record<Element, number>>;
  /** 그 해에 들어오는 기운이 내가 채워야 할 오행과 겹치는가 — 보완이 순조로운 해 */
  reinforcesPrimary: boolean;
  /** 그 해에 들어오는 기운이 이미 과다한 오행을 더하는가 — 덜어내기가 급한 해 */
  addsExcess: boolean;
  /** 그 해가 속한 대운 */
  daewoon: SeunDaewoon | null;
}

export interface SeunDaewoon {
  ganji: string;
  startAge: number;
  endAge: number;
  startYear: number;
  stemElement: Element;
  branchElement: Element;
}

export interface SeunTransition {
  /**
   * 대운이 바뀌는 나이. **연도가 아니라 나이로 표기한다** — 엔진의
   * `approxDaewoonStart()`가 절기 근사식이라 경계가 ±1~2년 흔들린다.
   * 리포트에는 "OO세 무렵 바뀝니다" 형태로만 쓰고 연도를 못 박지 말 것.
   */
  aroundAge: number;
  fromGanji: string;
  toGanji: string;
}

export interface SeunPlan {
  /** 올해부터 3년 (올해 포함) */
  years: SeunYear[];
  /** 3년 창 안에서 대운이 바뀌면 그 지점. 없으면 null */
  transition: SeunTransition | null;
  /** 3년 내내 배경이 되는 대운 (교체가 없을 때만 채워진다) */
  backgroundDaewoon: SeunDaewoon | null;
}

function ganjiKr(stem: Stem, branch: Branch): string {
  return `${stem}${branch}(${C.STEM_KR[stem]}${C.BRANCH_KR[branch]})`;
}

function toSeunDaewoon(d: {
  ganji: string;
  start_age: number;
  end_age: number;
  start_year: number;
  stem: Stem;
  branch: Branch;
}): SeunDaewoon {
  return {
    ganji: d.ganji,
    startAge: d.start_age,
    endAge: d.end_age,
    startYear: d.start_year,
    stemElement: C.STEM_ELEMENT[d.stem],
    branchElement: C.BRANCH_ELEMENT[d.branch],
  };
}

/**
 * 올해 포함 3년치 세운을 낸다.
 *
 * @param fromYear 기준 연도 (기본: 오늘). 테스트에서 고정하려면 명시한다
 */
export function buildSeunPlan(
  chart: SajuChart,
  cls: Classification,
  fromYear: number = new Date().getFullYear()
): SeunPlan {
  const birthYear = new Date(chart.birth_iso).getFullYear();
  const primary = cls.primary;
  const excess = new Set(cls.excessive);

  const years: SeunYear[] = [];
  for (let i = 0; i < 3; i++) {
    const year = fromYear + i;
    // 6/15는 입춘(2월 초)과 연말 경계 양쪽에서 안전한 연중 날짜다
    const p = calcYearPillar(year, 6, 15);
    const stemEl = C.STEM_ELEMENT[p.stem];
    const branchEl = C.BRANCH_ELEMENT[p.branch];

    const incoming: Partial<Record<Element, number>> = {};
    incoming[stemEl] = (incoming[stemEl] ?? 0) + 1;
    incoming[branchEl] = (incoming[branchEl] ?? 0) + 1;

    const age = year - birthYear;
    const dw = chart.daewoon.list.find((d) => age >= d.start_age && age <= d.end_age) ?? null;

    years.push({
      year,
      stem: p.stem,
      branch: p.branch,
      ganji: ganjiKr(p.stem, p.branch),
      stemElement: stemEl,
      branchElement: branchEl,
      incoming,
      reinforcesPrimary: primary != null && (stemEl === primary || branchEl === primary),
      addsExcess: excess.has(stemEl) || excess.has(branchEl),
      daewoon: dw ? toSeunDaewoon(dw) : null,
    });
  }

  // 대운 교체 판정 — 3년 창 안에서 대운 간지가 바뀌는 지점
  let transition: SeunTransition | null = null;
  for (let i = 1; i < years.length; i++) {
    const prev = years[i - 1].daewoon;
    const cur = years[i].daewoon;
    if (prev && cur && prev.ganji !== cur.ganji) {
      transition = { aroundAge: cur.startAge, fromGanji: prev.ganji, toGanji: cur.ganji };
      break;
    }
  }

  const first = years[0].daewoon;
  const backgroundDaewoon =
    transition === null && first && years.every((y) => y.daewoon?.ganji === first.ganji) ? first : null;

  return { years, transition, backgroundDaewoon };
}
