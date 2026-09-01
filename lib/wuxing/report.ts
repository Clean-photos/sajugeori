/**
 * report.ts — 리포트 전 섹션의 데이터 조립 (§① ~ §⑦).
 *
 * 순수 함수다. LLM이 쓰는 두 조각(한 줄 진단 보충 2문장·3년 흐름 한 문단)은 비동기라
 * 여기서 호출하지 않고, 호출부가 받아온 결과를 `narratives`로 끼워 넣는다 — 그래야
 * 이 모듈 전체를 API 없이 결정적으로 테스트할 수 있다.
 *
 * §5 재배치 방침(CEO 확정): A층은 1장 이내로 압축(축 3~4개 × 상위 3항목), B층 관계·
 * 사람 축·3년 세운을 확대. 무료 글(/guide/fill-*)을 읽고 온 유저는 A층을 이미 알고
 * 있으므로, 990원의 값은 "나에게·언제·누구와"에 있다.
 *
 * 계산 엔진 무접촉(하드룰 1).
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import type { Classification } from "./classify";
import { buildDiagnosis, type DiagnosisSkeleton } from "./diagnosis";
import { buildWuxingMap, buildYongsinCard, type WuxingMapData } from "./map-section";
import { josaIga, josaRoEuro } from "./josa";
import {
  dict,
  elementDict,
  pickAxisItems,
  type Axis,
  type DictItem,
  type DrainItem,
  type Strength,
} from "./dict";
import {
  computeRelation,
  relationEntry,
  axisPriority,
  peopleAxisIsPrimary,
  adjustForStrength,
  buildRelationDisplayBlock,
  buildRelationIntroLine,
  partnerGuide,
  observationGuide,
  relationDict,
  type RelationDisplayBlock,
  type StrengthAdjustment,
  type TenGodRelation,
} from "./relation";
import { buildSeunPrescription, type SeunPrescriptionPlan } from "./seun-prescription";

/** A층에서 한 축당 보여줄 항목 수 (§5 압축 — 상위 3항목) */
const ITEMS_PER_AXIS = 3;
/** A층에서 전개할 축 수 (§5 압축 — 3~4개) */
const AXIS_COUNT = 4;

// ── §③ 채우는 법 ─────────────────────────────────────────────────────
export interface FillAxisGroup {
  axis: Axis;
  axisLabel: string;
  items: DictItem[];
}

/**
 * §3 극단형 처방 안내 (docs/wuxing_pending_copy_v1.md §3, CEO 승인 2026-08-31).
 * 극단형 판정 시(frame==="follow") §③ 본체 전체를 이 블록으로 **대체**한다 —
 * B층 5블록·A층 축 항목은 렌더하지 않는다(문서 §6-3 "일반 채우기 처방 대신").
 * 우선 항목은 신규 제작 없이 A층 사전 §7(과다 시 설기) 항목을 그대로 쓴다.
 */
function buildExtremeIntro(target: Element): string {
  const kr = C.ELEMENT_KR[target];
  return `당신의 사주는 ${kr}(${target})${josaIga(target)} 유난히 강하게 모인 구조입니다. 이런 사주는 부족한 기운을 억지로 채우기보다, 강한 흐름을 따라가는 쪽이 명리학적으로 더 안정적입니다. 넘치는 기운을 누르려 하면 오히려 반발이 커질 수 있습니다.`;
}

const EXTREME_DIRECTION: Record<Element, string> = {
  木: "목의 흐름을 살려 화(火) 방향으로 흘려보내는 것이 유효합니다. 벌이는 일을 마무리까지 끌고 가는 데 집중해 보십시오.",
  火: "화의 흐름을 살려 토(土) 방향으로 흘려보내는 것이 유효합니다. 발산한 것을 결과물로 남기는 데 집중해 보십시오.",
  土: "토의 흐름을 살려 금(金) 방향으로 흘려보내는 것이 유효합니다. 쌓아온 것을 정리하고 기준을 세우는 데 집중해 보십시오.",
  金: "금의 흐름을 살려 수(水) 방향으로 흘려보내는 것이 유효합니다. 단단한 기준을 유연하게 표현하는 데 집중해 보십시오.",
  水: "수의 흐름을 살려 목(木) 방향으로 흘려보내는 것이 유효합니다. 생각한 것을 실제로 시작하는 데 집중해 보십시오.",
};

/**
 * §4 primary↔용신 충돌 안내 (docs/wuxing_pending_copy_v1.md §4, CEO 승인).
 * fill 프레임에서만 쓴다 — follow(극단형)는 §3이 본체를 통째로 대체하므로 §4가
 * 끼어들 자리가 없다(문서 §6-4 조건과 §6-3의 "대체" 원칙이 겹치는 지점).
 */
function buildDivergenceNote(primary: Element, yongsinByTrack: Element[], diverges: boolean): string {
  const primaryKr = C.ELEMENT_KR[primary];
  if (!diverges) {
    return `구조적으로 채워야 할 자리와 명리학적으로 필요한 기운이 ${primaryKr}(${primary})${josaRoEuro(primary)} 일치합니다. 아래 처방은 두 관점 모두에서 뒷받침되는 결과입니다.`;
  }
  const yongsinKr = yongsinByTrack.map((el) => C.ELEMENT_KR[el]).join("·");
  return `구조적으로 채워야 할 자리는 ${primaryKr}(${primary})이지만, 명리학적으로 균형을 위해 필요한 기운(용신)은 ${yongsinKr}입니다. 아래 처방은 ${primaryKr}(${primary}) 기준으로 구성되어 있으며, 용신 관점은 §② 용신 카드를 함께 참고해 주십시오.`;
}

export interface FillSectionData {
  frame: "fill" | "follow";
  /** 처방 대상 오행. 채우기면 부족 오행(primary), 순응이면 강한 오행(dominant) */
  target: Element | null;
  targetKr: string | null;
  /** 도입 문장 — fill이면 B층 인트로("부족한 오행은…"), follow면 §3-1 극단형 안내 */
  intro: string | null;
  relation: TenGodRelation | null;
  /** B층 5블록 — fill 프레임에서만. follow는 §3이 본체를 대체하므로 null */
  relationBlock: RelationDisplayBlock | null;
  /** A층 압축 결과 — fill 프레임에서만. follow는 [] */
  axes: FillAxisGroup[];
  /** §3-2 순응 방향 문구 — follow 프레임에서만 */
  extremeDirection: string | null;
  /** §3 우선 항목 — A층 사전 §7(과다 시 설기) 그대로. follow 프레임에서만 */
  drainItems: DrainItem[];
  /** §4 안내(일치/불일치) — fill 프레임에서만. follow는 null(§3이 대체) */
  divergenceNote: string | null;
  /** 보조 오행 — 직접 채우기 어려울 때 함께 쓰면 효과가 안정적이다(fill 전용) */
  supportElement: Element | null;
  supportElementKr: string | null;
  supportNote: string | null;
  /** §9 일간 강약 연동 — 재성 부족 + 신약이면 재성보다 비겁·인성을 먼저(fill 전용) */
  strengthAdjustment: StrengthAdjustment;
  /** 순응 프레임에서 명시적으로 제외한 오행(§3-④ 왕신충발) */
  excluded: Element[];
  excludedKr: string[];
  /** 사람 축을 크게 다뤄야 하는 관계인가(인성·관성·비겁) — §④ 강조 여부에 쓴다 */
  peopleAxisPrimary: boolean;
}

export function buildFillSection(chart: SajuChart, cls: Classification): FillSectionData {
  const target = cls.frame === "follow" ? cls.dominant : cls.primary;

  if (target === null) {
    return {
      frame: cls.frame,
      target: null,
      targetKr: null,
      intro: null,
      relation: null,
      relationBlock: null,
      axes: [],
      extremeDirection: null,
      drainItems: [],
      divergenceNote: null,
      supportElement: null,
      supportElementKr: null,
      supportNote: null,
      strengthAdjustment: { needed: false, reason: null, preferFirst: [] },
      excluded: [],
      excludedKr: [],
      peopleAxisPrimary: false,
    };
  }

  const relation = computeRelation(chart.day_master_element, target);
  const entry = elementDict(target);

  if (cls.frame === "follow") {
    return {
      frame: "follow",
      target,
      targetKr: C.ELEMENT_KR[target],
      intro: buildExtremeIntro(target),
      relation,
      relationBlock: null,
      axes: [],
      extremeDirection: EXTREME_DIRECTION[target],
      drainItems: entry.drain.items,
      divergenceNote: null,
      supportElement: null,
      supportElementKr: null,
      supportNote: null,
      strengthAdjustment: { needed: false, reason: null, preferFirst: [] },
      excluded: cls.exclude,
      excludedKr: cls.exclude.map((el) => C.ELEMENT_KR[el]),
      peopleAxisPrimary: peopleAxisIsPrimary(relation),
    };
  }

  const axes = axisPriority(relation, AXIS_COUNT).map((axis) => ({
    axis,
    axisLabel: dict.axisLabels[axis],
    items: pickAxisItems(target, axis, ITEMS_PER_AXIS),
  }));

  // §4 — primary↔용신 갈림 여부. buildYongsinCard가 이미 이 판정을 하므로 재사용한다
  // (같은 규칙을 두 곳에서 따로 계산하면 언젠가 어긋난다).
  const yongsin = buildYongsinCard(chart, cls);

  return {
    frame: "fill",
    target,
    targetKr: C.ELEMENT_KR[target],
    intro: buildRelationIntroLine(chart.day_master_element, target),
    relation,
    relationBlock: buildRelationDisplayBlock(chart.day_master_element, target),
    axes,
    extremeDirection: null,
    drainItems: [],
    divergenceNote: buildDivergenceNote(target, yongsin.yongsinByTrack, yongsin.divergesFromPrimary),
    supportElement: entry.supportElement,
    supportElementKr: C.ELEMENT_KR[entry.supportElement],
    supportNote: entry.supportNote,
    strengthAdjustment: adjustForStrength(relation, chart.day_master_element, chart.strength),
    excluded: [],
    excludedKr: [],
    peopleAxisPrimary: peopleAxisIsPrimary(relation),
  };
}

// ── §④ 사람 축 ───────────────────────────────────────────────────────
export interface PeopleSectionData {
  intro: string;
  priorityNote: string;
  /** ① 1순위 — 부족 오행을 가진 상대가 나에게 어떤 관계로 작동하는가 */
  partner: (ReturnType<typeof partnerGuide> & { target: Element; targetKr: string }) | null;
  byDayStemNote: string;
  /** ② 2순위 — 상대 사주의 전체 분포 */
  distribution: { note: string; rules: { condition: string; verdict: string }[] };
  /** ③ 피해야 할 조건 — mustInclude(절연 아님 고지)가 항상 함께 나간다 */
  avoid: { conditions: string[]; mustInclude: string };
  /** ④ 관계 유형별 적용 */
  byRelationType: { type: string; criterion: string }[];
  /** ⑤ 생년월일 없이 알아보는 법 — 톤 규칙·안내 문구가 항상 함께 */
  observation: ReturnType<typeof observationGuide>;
  /** 이 관계에서 사람 축이 1순위인가 — true면 섹션을 더 강조해 배치한다 */
  emphasized: boolean;
}

export function buildPeopleSection(chart: SajuChart, cls: Classification): PeopleSectionData {
  const target = cls.frame === "follow" ? cls.dominant : cls.primary;
  const people = relationDict.people;
  return {
    intro: people.intro,
    priorityNote: people.priorityNote,
    partner: target ? { ...partnerGuide(chart.day_master_element, target), target, targetKr: C.ELEMENT_KR[target] } : null,
    byDayStemNote: people.byDayStem.note,
    distribution: people.byDistribution,
    avoid: people.avoid,
    byRelationType: people.byRelationType,
    observation: observationGuide(target),
    emphasized: target !== null && peopleAxisIsPrimary(computeRelation(chart.day_master_element, target)),
  };
}

// ── §⑤ 넘치는 기운 다루기 ────────────────────────────────────────────
export interface DrainGroup {
  element: Element;
  elementKr: string;
  /** 설기가 흘러가는 방향(이 오행이 생하는 오행) */
  target: Element;
  targetKr: string;
  principle: string;
  items: DrainItem[];
}

export interface DrainSectionData {
  /** 과다 오행별 설기 처방. 과다가 없으면 빈 배열이고 섹션 자체를 렌더하지 않는다 */
  groups: DrainGroup[];
  /**
   * 수편 전용 companionDrain — "수 부족에 화 과다가 동반될 때"의 처방이다.
   * 수가 부족하고 화가 과다할 때만 노출한다. 수 과다 설기와 성격이 다르므로
   * groups와 섞지 않는다.
   */
  companion: DrainGroup | null;
}

export function buildDrainSection(cls: Classification): DrainSectionData {
  const groups: DrainGroup[] = cls.excessive.map((el) => {
    const d = elementDict(el);
    return {
      element: el,
      elementKr: C.ELEMENT_KR[el],
      target: d.drain.target,
      targetKr: C.ELEMENT_KR[d.drain.target],
      principle: d.drain.principle,
      items: d.drain.items,
    };
  });

  // 수 부족 + 화 과다일 때만 — 사전이 명시한 동반 조건 그대로
  const waterDeficient = cls.absent.includes("水") || cls.scarce.includes("水");
  const fireExcessive = cls.excessive.includes("火");
  const cd = elementDict("水").companionDrain;
  const companion: DrainGroup | null =
    waterDeficient && fireExcessive && cd
      ? {
          element: "水",
          elementKr: C.ELEMENT_KR["水"],
          target: cd.target,
          targetKr: C.ELEMENT_KR[cd.target],
          principle: cd.principle,
          items: cd.items,
        }
      : null;

  return { groups, companion };
}

// ── §⑦ 마무리 ────────────────────────────────────────────────────────
export interface ClosingSectionData {
  strengthLegend: Record<Strength, string>;
  /** 개운법 위상 고지 — 전통 내 통용, 과학적 검증 없음 (D44 원칙 승계) */
  disclaimer: string;
  dictionaryHref: string;
  guideHref: string;
}

export function buildClosingSection(): ClosingSectionData {
  return {
    strengthLegend: dict.strengthLegend,
    disclaimer: dict.disclaimer,
    dictionaryHref: "/dictionary",
    guideHref: "/guide",
  };
}

// ── 전체 조립 ────────────────────────────────────────────────────────
/** LLM이 생성하는 두 조각. 비동기라 바깥에서 받아 끼워 넣는다 */
export interface WuxingNarratives {
  /** §① 한 줄 진단 보충 2문장 */
  diagnosis?: { sentence1: string; sentence2: string };
  /** §⑥ 3년을 관통하는 흐름 한 문단 */
  seunFlow?: string;
}

export interface WuxingReportData {
  diagnosis: DiagnosisSkeleton;
  map: WuxingMapData;
  fill: FillSectionData;
  people: PeopleSectionData;
  drain: DrainSectionData;
  seun: SeunPrescriptionPlan;
  closing: ClosingSectionData;
  narratives: WuxingNarratives;
}

export function buildWuxingReport(
  chart: SajuChart,
  cls: Classification,
  narratives: WuxingNarratives = {},
  fromYear?: number
): WuxingReportData {
  return {
    diagnosis: buildDiagnosis(chart, cls),
    map: buildWuxingMap(chart, cls),
    fill: buildFillSection(chart, cls),
    people: buildPeopleSection(chart, cls),
    drain: buildDrainSection(cls),
    seun: buildSeunPrescription(chart, cls, fromYear),
    closing: buildClosingSection(),
    narratives,
  };
}

/** 리포트에 실제로 실리는 A층 항목 수 — "40개 이상" 같은 헤드라인 검증용 */
export function countFillItems(fill: FillSectionData): number {
  return fill.axes.reduce((sum, a) => sum + a.items.length, 0);
}

/** 관계 키워드(예: "내보내는 통로") — 섹션 제목에 쓰기 위해 얇게 노출 */
export function relationKeyword(relation: TenGodRelation): string {
  return relationEntry(relation).keyword;
}
