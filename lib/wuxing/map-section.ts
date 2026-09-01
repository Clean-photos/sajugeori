/**
 * map-section.ts — §2 오행 지도 섹션의 순수 로직.
 *
 * 기획서 §2가 요구하는 네 조각 중 원형도(circle-diagram.ts)를 뺀 셋을 조립한다:
 *   ① 오행 분포 막대 (개수 + 백분율 + 과다/부족 표기)
 *   ② 불균형 진단표 (과다 / 적정 / 부족 / 부재)
 *   ③ 용신·희신·기신 카드 (채워야 할 것과 피해야 할 것)
 *
 * 전부 코드 판정이다 — LLM 호출은 이 상품에서 2곳(한 줄 진단 보충·3년 흐름)으로
 * 고정돼 있고 여기는 그 둘 다 아니다.
 *
 * 계산 엔진 무접촉(하드룰 1).
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import { THRESHOLD, generatorOf, controllerOf, type Classification } from "./classify";
import { countElements, type ElementCount } from "./count";
import { CIRCLE_ORDER } from "./circle-diagram";

/**
 * §② 도입 서술 (docs/wuxing_pending_copy_v1.md §1, CEO 승인 2026-08-31).
 * 고정 도입문 + 판정 결과 연결문(4갈래, 코드가 선택). "부족 없음" 행은 방어
 * 코드로만 유지한다 — 8·6글자 사주에서 수학적으로 도달 불가능(§3-B-⑤ 확인 완료).
 */
const MAP_INTRO_FIXED =
  "사주에 어떤 기운이 적다고 해서 무조건 채워야 하는 것은 아닙니다. 그 사람에게 실제로 필요한 기운이 무엇인지에 따라 답이 달라지며, 이 리포트는 그 판정부터 시작합니다.";

const MAP_INTRO_CONNECTOR = {
  match:
    "구조적으로 부족한 기운과 명리학적으로 필요한 기운이 같습니다. 아래 처방은 두 관점 모두에서 일치하는 결과입니다.",
  mismatch:
    "구조적으로 부족한 기운과 명리학적으로 필요한 기운이 다르게 나왔습니다. 아래 처방은 이 차이를 함께 안내합니다.",
  extreme:
    "이 사주는 한 기운으로 강하게 모인 구조입니다. 이런 경우 부족한 것을 채우기보다 흐름을 따르는 편이 명리학적으로 더 유효합니다.",
  balanced: "여덟 글자에 뚜렷한 결핍이 보이지 않습니다. 아래는 채우기보다 흐름을 관리하는 처방입니다.",
} as const;

/**
 * §2 억부·조후 충돌 안내 (docs/wuxing_pending_copy_v1.md §2, CEO 승인).
 * 교집합이 없을 때만(trackRelation === "conflict") 노출한다.
 */
const YONGSIN_CONFLICT_NOTE =
  "이 사주는 몸을 보강하는 관점(억부)과 계절의 온도를 맞추는 관점(조후)이 서로 다른 기운을 가리킵니다. 두 관점이 갈리는 것은 흔한 일이며, 이 리포트는 조후를 우선하고 억부를 보조로 함께 제시합니다.";

// ── ① 오행 분포 막대 ──────────────────────────────────────────────────
export type ElementTier = "absent" | "scarce" | "normal" | "mildlyMany" | "excessive";

export const TIER_LABEL: Record<ElementTier, string> = {
  absent: "부재",
  scarce: "부족",
  normal: "적정",
  mildlyMany: "다소 많음",
  excessive: "과다",
};

/**
 * 개별 오행의 등급. classify.ts의 THRESHOLD를 그대로 재사용해 판정 로직과 표시가
 * 어긋나지 않게 한다.
 *
 * ⚠️ 5개 이상(극단형 후보)도 여기서는 "과다"로만 표기한다. 극단형은 **사주 전체의
 * 패턴 판정**이고 시간 미상이면 아예 판정하지 않는 분기라(결정 ②), 개별 오행 막대에
 * "극단"을 붙이면 시간 미상 유저에게 판정하지 않기로 한 라벨이 새어 나간다.
 */
export function tierOf(count: number): ElementTier {
  if (count <= THRESHOLD.absent) return "absent";
  if (count <= THRESHOLD.scarce) return "scarce";
  if (count < THRESHOLD.mildlyMany) return "normal";
  if (count < THRESHOLD.excessive) return "mildlyMany";
  return "excessive";
}

export interface ElementBar {
  element: Element;
  elementKr: string;
  count: number;
  /** 정수 백분율. 합계가 정확히 100이 되도록 최대잔여법으로 배분한다 */
  percent: number;
  /** 막대 길이 비율 0~1 (최댓값 기준 정규화가 아니라 전체 대비 실제 비중) */
  ratio: number;
  tier: ElementTier;
  tierLabel: string;
}

/**
 * 정수 백분율을 합계 100으로 맞춘다(최대잔여법).
 * 단순 반올림을 쓰면 8글자에서 0·25·25·37.5·12.5 → 0·25·25·38·13 = 101%처럼
 * 눈에 보이는 오차가 난다. 리포트에 "합계 101%"가 찍히면 계산이 틀린 것처럼 읽힌다.
 */
export function largestRemainderPercents(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map((c) => (c / total) * 100);
  const floored = exact.map((v) => Math.floor(v));
  let remaining = 100 - floored.reduce((a, b) => a + b, 0);
  // 잔여分을 소수부가 큰 순서로 1씩 나눠준다. 동률이면 인덱스가 앞선 쪽(오행 고정 순서)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floored];
  for (const { i } of order) {
    if (remaining <= 0) break;
    out[i] += 1;
    remaining -= 1;
  }
  return out;
}

export function buildElementBars(count: ElementCount): ElementBar[] {
  const counts = CIRCLE_ORDER.map((el) => count.surface[el]);
  const percents = largestRemainderPercents(counts);
  return CIRCLE_ORDER.map((el, i) => {
    const n = counts[i];
    const tier = tierOf(n);
    return {
      element: el,
      elementKr: C.ELEMENT_KR[el],
      count: n,
      percent: percents[i],
      ratio: count.charCount > 0 ? n / count.charCount : 0,
      tier,
      tierLabel: TIER_LABEL[tier],
    };
  });
}

// ── ② 불균형 진단표 ──────────────────────────────────────────────────
export interface ImbalanceRow {
  tier: ElementTier;
  label: string;
  elements: Element[];
  elementsKr: string[];
}

/** 등급별로 오행을 묶는다. 해당 오행이 하나도 없는 등급은 행 자체를 만들지 않는다 */
export function buildImbalanceRows(count: ElementCount): ImbalanceRow[] {
  const order: ElementTier[] = ["excessive", "mildlyMany", "normal", "scarce", "absent"];
  return order
    .map((tier) => {
      const elements = CIRCLE_ORDER.filter((el) => tierOf(count.surface[el]) === tier);
      return { tier, label: TIER_LABEL[tier], elements, elementsKr: elements.map((el) => C.ELEMENT_KR[el]) };
    })
    .filter((row) => row.elements.length > 0);
}

// ── ③ 용신·희신·기신 카드 ────────────────────────────────────────────
/**
 * 억부·조후 두 트랙의 관계 (결정 ① 3단계 규칙).
 *   intersect — 교집합이 있다. 그 교집합이 주 처방이고 근거가 가장 강하다
 *   conflict  — 교집합이 없다. 조후를 주 처방, 억부를 보조로 병기한다
 *   single    — 한쪽만 후보가 있다(조후가 "한난 중화"면 johu가 빈 배열이다)
 */
export type YongsinTrackRelation = "intersect" | "conflict" | "single";

export interface YongsinCardData {
  /** 채우기(fill) / 순응하기(follow) — 극단형이면 프레임이 뒤집힌다 */
  frame: "fill" | "follow";
  /** 주 처방 오행. 극단형에서는 "따라야 할" 오행이다 */
  main: Element | null;
  mainKr: string | null;
  /** 주 처방을 돕는 오행(희신 자리). 채우기면 main을 생하는 오행, 순응이면 설기 통로 */
  helper: Element | null;
  helperKr: string | null;
  /** 피해야 할 오행(기신 자리) */
  avoid: Element[];
  avoidKr: string[];
  /** 억부 트랙 후보 */
  eokbu: Element[];
  eokbuKr: string[];
  /** 조후 트랙 후보 */
  johu: Element[];
  johuKr: string[];
  /** 엔진이 판정한 한난조습 */
  climate: string;
  trackRelation: YongsinTrackRelation;
  /** 두 트랙의 교집합 (없으면 빈 배열) */
  intersection: Element[];
  /**
   * 결정 ①의 규칙으로 억부·조후에서 도출한 용신 후보.
   * 교집합이 있으면 교집합, 없으면 조후, 조후가 비었으면(한난 중화) 억부.
   *
   * ⚠️ 이것은 `main`(표면 계수가 가장 부족해 먼저 채울 오행)과 **다를 수 있다.**
   * 두 값은 서로 다른 질문에 답한다 — main은 "무엇이 비었나"(§3-B 부족 판정),
   * 이 값은 "이 사주에 무엇이 필요한가"(§1 용신 판정)이다. 실측상 채우기 프레임
   * 사주의 24.1%에서 둘이 갈린다. 어느 쪽을 최종 처방 축으로 삼을지는 미확정이라
   * (CEO 판단 대기) 지금은 **둘 다 노출하고 갈림 여부를 플래그로 알린다** — 한쪽을
   * 임의로 감추면 나머지 24%의 리포트가 근거와 어긋난 처방을 하게 된다.
   */
  yongsinByTrack: Element[];
  yongsinByTrackKr: string[];
  /** main이 yongsinByTrack에 없으면 true — 두 판정이 갈린 사주 */
  divergesFromPrimary: boolean;
  /**
   * 단일 용신으로 단정하지 않는다는 고지 — 결정 ①의 "단일 용신 단정 금지"와
   * 엔진 note("최종 용신은 격국까지 종합해 판단해야 한다")를 함께 반영한다.
   */
  disclaimer: string;
  /** 억부·조후가 갈릴 때(trackRelation === "conflict") 띄울 안내. 그 외에는 null */
  conflictNote: string | null;
}

const YONGSIN_DISCLAIMER =
  "억부(힘의 균형)와 조후(기후)는 목적이 다르므로 하나로 단정하지 않고 함께 제시합니다. 최종 용신은 격국까지 종합해 판단해야 합니다.";

export function buildYongsinCard(chart: SajuChart, cls: Classification): YongsinCardData {
  const eokbu = chart.yongsin.eokbu_candidates;
  const johu = chart.yongsin.johu_candidates;
  const intersection = eokbu.filter((el) => johu.includes(el));

  const trackRelation: YongsinTrackRelation =
    eokbu.length === 0 || johu.length === 0 ? "single" : intersection.length > 0 ? "intersect" : "conflict";

  const main = cls.frame === "follow" ? cls.dominant : cls.primary;

  // 희신 자리 — 채우기면 main을 생해 주는 오행, 순응이면 강한 기운을 흘려보낼 설기 통로
  const helper = main === null ? null : cls.frame === "follow" ? C.GENERATES[main] : generatorOf(main);

  // 기신 자리 — 순응 프레임에서는 classify가 이미 "명시적으로 제외할 오행"을 계산해 둔다.
  // 채우기 프레임에서는 과다 오행(더 키우면 안 되는 것) + main을 극하는 오행을 합친다.
  const avoidSet = new Set<Element>(cls.frame === "follow" ? cls.exclude : cls.excessive);
  if (cls.frame === "fill" && main !== null) avoidSet.add(controllerOf(main));
  // 주 처방 오행이 피해야 할 목록에 동시에 들어가면 자기모순이라 제거한다
  if (main !== null) avoidSet.delete(main);
  const avoid = CIRCLE_ORDER.filter((el) => avoidSet.has(el));

  // 결정 ① 규칙: 교집합 > 조후 > (조후가 비면) 억부
  const yongsinByTrack = intersection.length > 0 ? intersection : johu.length > 0 ? johu : eokbu;
  const divergesFromPrimary = main !== null && yongsinByTrack.length > 0 && !yongsinByTrack.includes(main);

  return {
    frame: cls.frame,
    main,
    mainKr: main ? C.ELEMENT_KR[main] : null,
    helper,
    helperKr: helper ? C.ELEMENT_KR[helper] : null,
    avoid,
    avoidKr: avoid.map((el) => C.ELEMENT_KR[el]),
    eokbu,
    eokbuKr: eokbu.map((el) => C.ELEMENT_KR[el]),
    johu,
    johuKr: johu.map((el) => C.ELEMENT_KR[el]),
    climate: chart.yongsin.climate,
    trackRelation,
    intersection,
    yongsinByTrack,
    yongsinByTrackKr: yongsinByTrack.map((el) => C.ELEMENT_KR[el]),
    divergesFromPrimary,
    disclaimer: YONGSIN_DISCLAIMER,
    conflictNote: trackRelation === "conflict" ? YONGSIN_CONFLICT_NOTE : null,
  };
}

// ── 섹션 전체 조립 ───────────────────────────────────────────────────
export interface WuxingMapData {
  count: ElementCount;
  bars: ElementBar[];
  imbalance: ImbalanceRow[];
  yongsin: YongsinCardData;
  /** 시간 미상 고지 — 결정 ②. 6글자라 판정 정밀도가 떨어진다는 안내를 띄울지 */
  hourUnknown: boolean;
  /** §② 도입 서술 — 고정 도입문 + 판정 결과 연결문(4갈래 중 하나) */
  intro: string;
}

/**
 * §1-2 연결문 4갈래 판정. 우선순위: 극단형 → 부족 없음(방어, 도달 불가 확인됨) →
 * primary=용신 일치/불일치. 극단형은 cls.primary가 dominant와 같은 값이라(classify.ts),
 * 이 분기를 먼저 걸지 않으면 아래 일치/불일치 분기로 잘못 빠진다.
 */
function pickMapIntroConnector(cls: Classification, divergesFromPrimary: boolean): string {
  if (cls.pattern === "extreme") return MAP_INTRO_CONNECTOR.extreme;
  if (cls.primary === null) return MAP_INTRO_CONNECTOR.balanced;
  return divergesFromPrimary ? MAP_INTRO_CONNECTOR.mismatch : MAP_INTRO_CONNECTOR.match;
}

export function buildWuxingMap(chart: SajuChart, cls: Classification): WuxingMapData {
  const count = countElements(chart);
  const yongsin = buildYongsinCard(chart, cls);
  return {
    count,
    bars: buildElementBars(count),
    imbalance: buildImbalanceRows(count),
    yongsin,
    hourUnknown: cls.hourUnknown,
    intro: `${MAP_INTRO_FIXED} ${pickMapIntroConnector(cls, yongsin.divergesFromPrimary)}`,
  };
}
