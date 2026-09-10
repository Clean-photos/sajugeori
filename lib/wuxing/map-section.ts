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
import { josaWaGwa, josaEunNeun, josaEulReul } from "./josa";
import { buildYongsinDualTrack, type YongsinTrackRelation } from "@/lib/premium/yongsin-track";
import { computeRelation, adjustForStrength } from "./relation";
import { supportElementConflictsWithClimate } from "./dict";

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

/**
 * §2(CoS 실물 확인, 2026-09-08, 부수 지적): 표면 개수가 동률인 후보 중 primary로
 * 뽑히지 않은 오행은 지금까지 어느 서술에도 등장하지 않았다(분포 막대·표에는
 * 숫자로는 있지만, "왜 중요한지"를 짚어 주는 문장이 전혀 없었다) — 특히 그 오행이
 * 조후가 가리키는 오행이면(실측: 부족 金과 동률인 水가 燥熱 사주의 조후 후보이자
 * 표면 최소값인데도 본문 어디에도 이름이 안 나옴) 놓치면 안 되는 정보다. classify.ts가
 * 이미 계산해 둔 cls.secondary(동률로 밀린 후보)를 한 줄로 명시한다. biased(부재
 * 2개 이상) 패턴은 diagnosis.ts 헤드라인이 이미 L1·L2를 함께 짚으므로 중복을
 * 피해 여기서는 다루지 않는다 — scarce1(균형형인데 동률로 하나만 뽑힌 경우)에서만
 * 필요한 보완이다.
 */
function buildTieNote(cls: Classification, chart: SajuChart): string | null {
  if (cls.pattern !== "balanced" || !cls.primary || cls.secondary.length === 0) return null;
  const primary = cls.primary;
  const primaryKr = `${primary}(${C.ELEMENT_KR[primary]})`;
  const secondaryKr = cls.secondary.map((el) => `${el}(${C.ELEMENT_KR[el]})`).join("·");
  const johuTied = cls.secondary.filter((el) => chart.yongsin.johu_candidates.includes(el));
  if (johuTied.length > 0) {
    const johuTiedKr = johuTied.map((el) => `${el}(${C.ELEMENT_KR[el]})`).join("·");
    const johuLast = johuTied[johuTied.length - 1];
    return `${secondaryKr}도 ${primaryKr}${josaWaGwa(primary)} 표면 개수가 똑같이 가장 적습니다. 특히 ${johuTiedKr}${josaEunNeun(johuLast)} 이 사주의 조후(계절) 판정이 필요로 하는 기운이기도 해, 이번에 ${primaryKr}${josaEulReul(primary)} 먼저 다루더라도 함께 눈여겨볼 만합니다.`;
  }
  return `${secondaryKr}도 ${primaryKr}${josaWaGwa(primary)} 표면 개수가 똑같이 가장 적어, 함께 부족한 오행입니다.`;
}

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
  /**
   * §0-1: 조후 후보 중 「채우는 법」 본문이 실제로 처방하는 오행(= main, P4면
   * 비겁·인성 포함). conflict일 때 이것만 "주 처방"으로 표기한다.
   */
  johuPrescribed: Element[];
  johuPrescribedKr: string[];
  /**
   * §0-1: 조후 후보 중 본문 처방에는 없는 오행 — 직접 쌓지 않고 환경·계절로
   * 방향만 맞춘다. 비어 있지 않으면 conflict 블록에서 별도 줄로 안내한다.
   */
  johuClimateOnly: Element[];
  johuClimateOnlyKr: string[];
}

/**
 * §1(CoS+CEO 결정 2026-09-08): 억부·조후 병기 계산 자체는 lib/premium/yongsin-track.ts로
 * 옮겨 상품 공통으로 쓴다(운명 설계도가 이 계산을 따로 하다 조후를 사실상
 * 무시하던 문제 — dev 문서 §1 참고). 여기서는 그 공용 계산에 wuxing 전용인
 * main/helper/avoid(표면 계수 기반 처방)만 더한다.
 */
export function buildYongsinCard(chart: SajuChart, cls: Classification): YongsinCardData {
  const track = buildYongsinDualTrack(chart);

  const main = cls.frame === "follow" ? cls.dominant : cls.primary;

  // 희신 자리 — 채우기면 main을 생해 주는 오행, 순응이면 강한 기운을 흘려보낼 설기 통로
  //
  // §0-3(CoS 실물 재검증, 2026-09-09): report.ts의 supportElement는 조후 충돌 시
  // 이미 접었는데(§4-1), 같은 오행을 가리키는 이 카드의 「도움이 되는 기운」
  // 필드는 필터를 안 타서 寒濕 사주에 "위를 생해 주는 오행 → 水"가 그대로
  // 노출됐다(실측: 부족 木·寒濕 사주에서 helper=水). 채우기 프레임에서만,
  // 이 사주의 조후를 정반대로 악화시키는 오행이면 제안 자체를 접는다
  // (순응 프레임의 helper는 "설기 통로"라 의미가 달라 건드리지 않는다).
  const rawHelper = main === null ? null : cls.frame === "follow" ? C.GENERATES[main] : generatorOf(main);
  const helper =
    rawHelper !== null && cls.frame === "fill" && supportElementConflictsWithClimate(rawHelper, chart.yongsin.climate)
      ? null
      : rawHelper;

  // 기신 자리 — 순응 프레임에서는 classify가 이미 "명시적으로 제외할 오행"을 계산해 둔다.
  // 채우기 프레임에서는 과다 오행(더 키우면 안 되는 것) + main을 극하는 오행을 합친다.
  const avoidSet = new Set<Element>(cls.frame === "follow" ? cls.exclude : cls.excessive);
  if (cls.frame === "fill" && main !== null) avoidSet.add(controllerOf(main));
  // 주 처방 오행이 피해야 할 목록에 동시에 들어가면 자기모순이라 제거한다
  if (main !== null) avoidSet.delete(main);

  // P4(재다신약류) 판정 — avoid 정리(§4-2)와 조후 후보 분리(§0-1) 양쪽에서 쓴다.
  const adjustment =
    cls.frame === "fill" && main !== null
      ? adjustForStrength(computeRelation(chart.day_master_element, main), chart.day_master_element, chart.strength)
      : { needed: false, reason: null, preferFirst: [] as Element[] };

  // §4-2(CoS+CEO 실물 확인, 2026-09-08, 신규 회귀): P4 발동 시 본문 「먼저 세우기」가
  // 비겁(일간 자신의 오행)·인성을 맨 앞으로 승격하는데, 이 카드는 그 사실을 모르고
  // "main을 극하는 오행"을 기계적으로 피할 것에 넣는다 — main이 재성/관성/식상이면
  // 그 오행을 극하는 쪽이 종종 비겁과 같아서(예: 재성의 극자는 비겁), 같은 화면이
  // "먼저 채우세요"와 "피하세요"를 동시에 말하는 사고가 났다(실측: 庚 신약·부족
  // 木=재성 사주에서 金을 두 번 다르게 부름). P4가 걸리면 preferFirst는 avoid에서 뺀다.
  if (adjustment.needed) for (const el of adjustment.preferFirst) avoidSet.delete(el);
  const avoid = CIRCLE_ORDER.filter((el) => avoidSet.has(el));

  // §0-1(CoS 실물 재검증, 2026-09-09): trackRelation === "conflict"에서 조후 후보
  // 전체를 "주 처방"으로 표에 적었으나, 「채우는 법」 본문은 main(표면 부족 오행)
  // 하나만 처방한다 — "주 처방 火"라 써놓고 火 처방 항목이 0개인 자기모순이
  // 났다(실측: 표본 B, 조후 火·木 / main 木 / 火 항목 0). 조후 후보를
  //  · prescribed  = 「채우는 법」 본문이 실제로 다루는 것(main + P4면 preferFirst)
  //  · climateOnly = 나머지 — 직접 쌓지 않고 환경·계절로 방향만 맞추는 것
  // 으로 갈라, 처방 항목이 0개인 오행을 "주 처방"으로 표기하지 않는다.
  const filledBody = new Set<Element>([...(main !== null ? [main] : []), ...adjustment.preferFirst]);
  const johuPrescribed = track.johu.filter((el) => filledBody.has(el));
  const johuClimateOnly = track.johu.filter((el) => !filledBody.has(el));

  const divergesFromPrimary = main !== null && track.yongsinByTrack.length > 0 && !track.yongsinByTrack.includes(main);

  return {
    frame: cls.frame,
    main,
    mainKr: main ? C.ELEMENT_KR[main] : null,
    helper,
    helperKr: helper ? C.ELEMENT_KR[helper] : null,
    avoid,
    avoidKr: avoid.map((el) => C.ELEMENT_KR[el]),
    eokbu: track.eokbu,
    eokbuKr: track.eokbuKr,
    johu: track.johu,
    johuKr: track.johuKr,
    climate: track.climate,
    trackRelation: track.trackRelation,
    intersection: track.intersection,
    yongsinByTrack: track.yongsinByTrack,
    yongsinByTrackKr: track.yongsinByTrackKr,
    divergesFromPrimary,
    disclaimer: track.disclaimer,
    conflictNote: track.trackRelation === "conflict" ? YONGSIN_CONFLICT_NOTE : null,
    johuPrescribed,
    johuPrescribedKr: johuPrescribed.map((el) => C.ELEMENT_KR[el]),
    johuClimateOnly,
    johuClimateOnlyKr: johuClimateOnly.map((el) => C.ELEMENT_KR[el]),
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
  /** §2(2026-09-08) 동률 오행 안내 — 해당 없으면 null */
  tieNote: string | null;
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
    tieNote: buildTieNote(cls, chart),
  };
}
