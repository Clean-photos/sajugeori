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
 * 승인 대기 중인 문구 슬롯. **임의로 채우지 말 것**(dev_handoff §10·§11 임의 생성 금지).
 * null인 동안 해당 UI 슬롯은 렌더되지 않는다 — 비어 보이는 편이 지어낸 문구보다 낫다.
 * 승인되면 여기만 채우면 화면에 바로 붙는다.
 */
export const PENDING_COPY = {
  /** 결정 ④ — §② 도입 서술("부족하다고 다 채우는 것이 아니라…"). 취지만 확정, 문구 미승인 */
  mapIntro: null as string | null,
  /** 억부·조후가 갈릴 때의 안내 문구(결정 ① 3단계 규칙의 서술). 문구 미승인 */
  yongsinConflict: null as string | null,
  /** 극단 편중형 전용 처방 문구(§3-④ "채우기가 아니라 순응하기"). 문구 미승인 */
  extremeFrame: null as string | null,
  /**
   * primary(구조적 부족)와 억부·조후 용신이 갈리는 사주(실측 24.1%)에 붙일 안내.
   * 통합 규칙(CEO 확정): §③ 채우는 법의 기준은 primary로 유지하고, 용신 카드는
   * 별도 개념(명리학적 균형 판단)으로 명시한다. 갈릴 때 숨기지 않고 "관점이
   * 갈리는 사주"임을 밝힌다 — 결정 ①의 억부·조후 병기와 같은 원칙. 문구 미승인.
   */
  primaryYongsinDivergence: null as string | null,
};

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
  /** 억부·조후가 갈릴 때 띄울 안내. 문구 미승인이라 지금은 항상 null (PENDING_COPY) */
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
    conflictNote: trackRelation === "conflict" ? PENDING_COPY.yongsinConflict : null,
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
  /** §② 도입 서술. 문구 미승인이라 지금은 null (PENDING_COPY) */
  intro: string | null;
}

export function buildWuxingMap(chart: SajuChart, cls: Classification): WuxingMapData {
  const count = countElements(chart);
  return {
    count,
    bars: buildElementBars(count),
    imbalance: buildImbalanceRows(count),
    yongsin: buildYongsinCard(chart, cls),
    hourUnknown: cls.hourUnknown,
    intro: PENDING_COPY.mapIntro,
  };
}
