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
import { buildWuxingMap, PENDING_COPY, type WuxingMapData } from "./map-section";
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

export interface FillSectionData {
  frame: "fill" | "follow";
  /** 처방 대상 오행. 채우기면 부족 오행(primary), 순응이면 강한 오행(dominant) */
  target: Element | null;
  targetKr: string | null;
  /** "당신에게 부족한 오행은 …이며, … 일간에게 …에 해당합니다." */
  intro: string | null;
  relation: TenGodRelation | null;
  /** B층 5블록 — LLM 재생성 없이 그대로 노출한다(A안) */
  relationBlock: RelationDisplayBlock | null;
  /** A층 압축 결과 — 관계별 우선 축 3~4개 × 상위 3항목 */
  axes: FillAxisGroup[];
  /** 보조 오행 — 직접 채우기 어려울 때 함께 쓰면 효과가 안정적이다 */
  supportElement: Element | null;
  supportElementKr: string | null;
  supportNote: string | null;
  /** §9 일간 강약 연동 — 재성 부족 + 신약이면 재성보다 비겁·인성을 먼저 */
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
  const axes = axisPriority(relation, AXIS_COUNT).map((axis) => ({
    axis,
    axisLabel: dict.axisLabels[axis],
    items: pickAxisItems(target, axis, ITEMS_PER_AXIS),
  }));

  return {
    frame: cls.frame,
    target,
    targetKr: C.ELEMENT_KR[target],
    intro: buildRelationIntroLine(chart.day_master_element, target),
    relation,
    relationBlock: buildRelationDisplayBlock(chart.day_master_element, target),
    axes,
    supportElement: entry.supportElement,
    supportElementKr: C.ELEMENT_KR[entry.supportElement],
    supportNote: entry.supportNote,
    strengthAdjustment: adjustForStrength(relation, chart.day_master_element, chart.strength),
    excluded: cls.exclude,
    excludedKr: cls.exclude.map((el) => C.ELEMENT_KR[el]),
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
  /** 승인 대기 문구 슬롯 4종. 전부 null이면 해당 자리는 렌더되지 않는다 */
  pending: typeof PENDING_COPY;
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
    pending: PENDING_COPY,
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
