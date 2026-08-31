/**
 * classify.ts — 오행 보완 리포트 §2/§3-B: 부족 오행 판정과 유형 분기.
 *
 * 이 분기가 없으면 일부 사주에 정반대 처방이 나간다(§3-④ 왕신충발). 특히 극단형은
 * 처방 방향 자체를 뒤집으므로, 오판정 비용이 가장 큰 지점이다.
 *
 * 계산 엔진 무접촉(하드룰 1) — `lib/saju-engine/`은 읽기만 한다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import { countElements, type ElementCount } from "./count";

/**
 * 판정 임계값 (CEO 확정 2026-08-31). 1970~2005년 6,912개 표본 실측 빈도를 근거로 잡았다.
 * - 극단형 5개: 8글자 기준 5.2%. 4개는 28.2%라 "특수 구조" 서술이 무의미해진다
 * - 편중형 부재 2개: 15.7%
 */
export const THRESHOLD = {
  /** 표면 개수 0 = 부재 */
  absent: 0,
  /** 표면 개수 1 = 부족 */
  scarce: 1,
  /** 부재 오행이 이 개수 이상이면 편중형 */
  biasedAbsentCount: 2,
  /** 한 오행이 이 개수 이상이면 극단형 (8글자 기준) */
  extremeDominant: 5,
  /**
   * 과다 판정 비율 — 표면 개수 / 전체 글자 수. 8글자에서 3개(=0.375)에 해당한다.
   * 글자 수가 다른 시간 미상(6글자)에도 같은 비율로 적용되도록 개수가 아닌 비율로 둔다.
   */
  excessiveRatio: 3 / 8,
} as const;

export type WuxingPattern = "balanced" | "biased" | "extreme";

/** 주 처방 오행이 어떤 규칙으로 정해졌는가 (§3-③ 우선순위) */
export type PrimaryRule = "only" | "johu" | "flow" | "inseong" | "none";

export interface Classification {
  pattern: WuxingPattern;
  /** 처방 프레임 — 극단형은 "채우기"가 아니라 "순응하기"로 뒤집는다(§3-④) */
  frame: "fill" | "follow";

  /** 표면 0개 */
  absent: Element[];
  /** 표면 1개 */
  scarce: Element[];
  /** 표면 비율이 과다 임계 이상 */
  excessive: Element[];
  /** 극단형에서 판을 장악한 오행 */
  dominant: Element | null;

  /** 주 처방 오행. 극단형이면 "강화·순응할" 오행, 그 외엔 "채울" 오행 */
  primary: Element | null;
  /** 보조 오행 (편중형의 나머지 부족분, 극단형의 설기 통로) */
  secondary: Element[];
  /** 처방에서 명시적으로 제외할 오행 — 극단형에서 dominant를 극하는 오행(§3-④) */
  exclude: Element[];

  /** primary 선정 근거 */
  primaryRule: PrimaryRule;
  /**
   * 시간 미상이라 극단형 판정을 보류했는가. true면 리포트에 정밀도 고지를 띄운다.
   * (6글자에서는 부재 2개 이상이 42.0%로 15.7%의 2.7배라 같은 임계값을 쓸 수 없다)
   */
  hourUnknown: boolean;
  count: ElementCount;
}

/** 오행 X를 생하는 오행 (인성 방향) */
export function generatorOf(el: Element): Element {
  for (const [k, v] of Object.entries(C.GENERATES) as [Element, Element][]) {
    if (v === el) return k;
  }
  return el;
}

/** 오행 X를 극하는 오행 */
export function controllerOf(el: Element): Element {
  for (const [k, v] of Object.entries(C.CONTROLS) as [Element, Element][]) {
    if (v === el) return k;
  }
  return el;
}

/**
 * 편중형 주 처방 선정 (§3-③ 순서대로 적용).
 *
 * 1) 조후 — 계절의 한난조습을 먼저 맞춘다. 엔진이 이미 월지·화수 격차로 조후 후보를
 *    산출해 두므로 그 결과를 그대로 쓴다(겨울생에 화 없음 / 여름생에 수 없음이 여기 걸린다)
 * 2) 유통 — 상생 사슬이 끊긴 지점을 잇는 오행. 그 오행을 채우면 이미 있는 양옆(생해 주는
 *    오행·생받을 오행)이 연결되어 전체가 돈다
 * 3) 일간 관계 — 위 둘로 안 갈리면 일간을 생하는 오행(인성)을 우선
 */
function pickPrimary(
  candidates: Element[],
  chart: SajuChart,
  count: ElementCount
): { primary: Element | null; rule: PrimaryRule } {
  if (candidates.length === 0) return { primary: null, rule: "none" };
  if (candidates.length === 1) return { primary: candidates[0], rule: "only" };

  // 1) 조후
  const johu = candidates.filter((el) => chart.yongsin.johu_candidates.includes(el));
  if (johu.length === 1) return { primary: johu[0], rule: "johu" };
  const narrowed = johu.length > 1 ? johu : candidates;

  // 2) 유통 — 채우면 끊긴 상생 고리가 이어지는 오행
  const flow = narrowed.filter((el) => {
    const gen = generatorOf(el);          // el을 생해 주는 오행
    const child = C.GENERATES[el];        // el이 생하는 오행
    return count.surface[gen] > 0 && count.surface[child] > 0;
  });
  if (flow.length === 1) return { primary: flow[0], rule: "flow" };
  const narrowed2 = flow.length > 1 ? flow : narrowed;

  // 3) 일간 관계 — 인성(일간을 생하는 오행) 우선
  const inseong = generatorOf(chart.day_master_element);
  if (narrowed2.includes(inseong)) return { primary: inseong, rule: "inseong" };

  // 그래도 안 갈리면 부족이 더 심한 쪽(표면 개수 적은 순) — 결정적이어야 하므로 오행 고정 순서로 타이브레이크
  const sorted = [...narrowed2].sort((a, b) => {
    if (count.surface[a] !== count.surface[b]) return count.surface[a] - count.surface[b];
    return C.ELEMENTS.indexOf(a) - C.ELEMENTS.indexOf(b);
  });
  return { primary: sorted[0], rule: "inseong" };
}

export function classify(chart: SajuChart): Classification {
  const count = countElements(chart);
  const { surface, charCount, hasHour } = count;

  const absent = C.ELEMENTS.filter((el) => surface[el] === THRESHOLD.absent);
  const scarce = C.ELEMENTS.filter((el) => surface[el] === THRESHOLD.scarce);
  const excessive = C.ELEMENTS.filter((el) => surface[el] / charCount >= THRESHOLD.excessiveRatio);

  // 극단형 판정은 시간 미상이면 하지 않는다 (CEO 결정 ②).
  // 6글자에서는 같은 임계값이 오판정을 대량 생산하는데, 극단형은 처방 방향을 반대로
  // 뒤집는 분기라 틀렸을 때의 비용이 가장 크다.
  const dominant = hasHour
    ? C.ELEMENTS.find((el) => surface[el] >= THRESHOLD.extremeDominant) ?? null
    : null;

  if (dominant) {
    // 순응 프레임: 강한 오행 자체 + 그것이 생하는 방향(설기 통로)을 쓰고,
    // 그 오행을 극하는 오행은 왕신충발 위험이 있어 명시적으로 제외한다(§3-④)
    return {
      pattern: "extreme",
      frame: "follow",
      absent,
      scarce,
      excessive,
      dominant,
      primary: dominant,
      secondary: [C.GENERATES[dominant]],
      exclude: [controllerOf(dominant)],
      primaryRule: "only",
      hourUnknown: false,
      count,
    };
  }

  // 채우기 프레임 — 부재를 우선 후보로, 없으면 부족을 후보로 본다
  const candidates = absent.length > 0 ? absent : scarce;
  const { primary, rule } = pickPrimary(candidates, chart, count);
  const secondary = candidates.filter((el) => el !== primary);

  return {
    pattern: absent.length >= THRESHOLD.biasedAbsentCount ? "biased" : "balanced",
    frame: "fill",
    absent,
    scarce,
    excessive,
    dominant: null,
    primary,
    secondary,
    exclude: [],
    primaryRule: rule,
    // 시간 미상이면 극단형을 걸러내지 못한 채 균형/편중으로만 판정했다는 뜻이라 고지가 필요하다
    hourUnknown: !hasHour,
    count,
  };
}
