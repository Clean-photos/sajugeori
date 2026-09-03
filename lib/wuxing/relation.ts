/**
 * relation.ts — B층 관계 레이어 (§10-4).
 *
 * A층은 "수(水)는 흑색·북쪽·해조류"처럼 일간과 무관한 오행 속성이다. 그러나 **부족한
 * 오행을 채우면 나에게 무슨 일이 일어나는가**는 일간에 따라 완전히 달라진다.
 *
 *   금 일간에게 수 = 금생수 = 식상 (내 기운이 흘러나가는 통로)
 *   목 일간에게 수 = 수생목 = 인성 (나를 받쳐주는 기반)
 *   화 일간에게 수 = 수극화 = 관성 (나를 규율하는 틀)
 *
 * 같은 "수 부족"인데 결핍의 의미가 전부 다르다. A층만 쓰면 이 차이가 통째로 빠진다.
 * 일간 10개 × 오행 5개 = 50조합을 만들 필요는 없다. 관계로 압축하면 5가지로 끝난다.
 *
 * 계산 엔진 무접촉(하드룰 1).
 */
import relationJson from "./relation.json";
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { StrengthResult } from "@/lib/saju-engine/engine";
import { AXES, type Axis } from "./dict";

export type TenGodRelation = "식상" | "인성" | "재성" | "관성" | "비겁";

export const RELATIONS: TenGodRelation[] = ["식상", "인성", "재성", "관성", "비겁"];

export interface RelationEntry {
  label: string;
  keyword: string;
  definition: string;
  /** 결핍의 의미 */
  deficiency: string;
  /** 실생활 발현 */
  symptoms: string[];
  /** 채워졌을 때 */
  whenFilled: string;
  /** 주의점 — 사용자에게 보여줄 문장만. 집필 지침은 writerNote로 분리했다 */
  caution: string;
  /**
   * 개발·프롬프트 설계용 메모. **절대 프롬프트의 "쓸 내용"으로 넘기거나 리포트에
   * 노출하지 말 것** — LLM에게 지침과 본문을 같은 텍스트로 주면 지침 문장 자체를
   * 리포트에 출력하는 사고가 난다(실측: 관성·재성 caution에서 발견). 여기 담긴
   * 내용은 (a) 이미 코드로 처리됐다는 안내이거나 (b) 프롬프트 공통 RULE로 별도
   * 전달해야 하는 톤 지침이다.
   */
  writerNote?: string;
  /** 원문의 우선 실행 축 서술 (사람 축 포함) */
  axisNote: string;
  /** A층 축만 추린 우선순위 — "사람"은 A층 축이 아니라 B층 사람 축 섹션이 담당한다 */
  axisPriority: Axis[];
  /** 원문에서 사람 축이 몇 번째로 언급되는가. null이면 언급 없음 */
  peopleRank: number | null;
  /** 일간 강약을 먼저 확인해야 하는 관계 (재성 — 재다신약) */
  requiresStrengthCheck?: boolean;
}

export interface PeopleBlock {
  intro: string;
  priorityNote: string;
  byDayStem: {
    note: string;
    rows: Record<TenGodRelation, { partnerIs: string; effect: string; fitFor: string }>;
  };
  byDistribution: { note: string; rules: { condition: string; verdict: string }[] };
  /** mustInclude는 렌더에서 반드시 함께 나가야 하는 문구다 — 빠지면 사람을 판정하는 도구가 된다 */
  avoid: { conditions: string[]; mustInclude: string };
  byRelationType: { type: string; criterion: string }[];
  observation: {
    note: string;
    toneRule: string;
    rows: Record<Element, string>;
    mustInclude: string;
  };
  /**
   * §④ 관계 유형별 적용에 주입하는 부족 오행별 인물 묘사(2문장).
   * 관계 유형 4개마다 다시 쓰지 않고 이 묘사 하나를 공통으로 붙인다 — 배우자든
   * 동업자든 "그 기운을 가진 사람"의 특징은 같으므로 20개를 만들 필요가 없다.
   */
  elementPersona: Record<Element, string>;
}

export interface RelationDict {
  version: number;
  source: string;
  note: string;
  relations: Record<TenGodRelation, RelationEntry>;
  people: PeopleBlock;
}

export const relationDict = relationJson as unknown as RelationDict;

/**
 * 일간 오행(D)에서 본 대상 오행(L)의 십성 관계.
 *
 *   D 생 L → 식상  |  L 생 D → 인성  |  D 극 L → 재성
 *   L 극 D → 관성  |  D = L → 비겁
 *
 * 5×5 = 25조합이 이 다섯 갈래로 빠짐없이 나뉜다(테스트로 고정).
 */
export function computeRelation(dayElement: Element, target: Element): TenGodRelation {
  if (dayElement === target) return "비겁";
  if (C.GENERATES[dayElement] === target) return "식상";
  if (C.GENERATES[target] === dayElement) return "인성";
  if (C.CONTROLS[dayElement] === target) return "재성";
  return "관성"; // C.CONTROLS[target] === dayElement
}

export function relationEntry(rel: TenGodRelation): RelationEntry {
  return relationDict.relations[rel];
}

/**
 * A층에서 전개할 축을 관계에 맞춰 고른다 (§5 — 6축 전량 나열 금지, 3~4개만).
 *
 * 관계별 우선 축은 사전에 명시돼 있으나 2~3개뿐이라, 모자라는 자리는 고정 순서로 채운다.
 * 색을 첫 폴백으로 두는 이유는 실행 장벽이 가장 낮고(물건 하나 바꾸기) 어느 관계에나
 * 적용되기 때문이다. 폴백 순서가 고정이라 같은 입력이면 결과가 항상 같다.
 */
const FALLBACK_AXES: Axis[] = ["color", "food", "direction", "material", "habit", "environment"];

export function axisPriority(rel: TenGodRelation, count = 4): Axis[] {
  const named = relationEntry(rel).axisPriority;
  const out: Axis[] = [...named];
  for (const ax of FALLBACK_AXES) {
    if (out.length >= count) break;
    if (!out.includes(ax)) out.push(ax);
  }
  return out.slice(0, count);
}

/** 사람 축을 크게 다뤄야 하는 관계인가 — 원문에서 사람이 1순위로 꼽힌 인성·관성·비겁 */
export function peopleAxisIsPrimary(rel: TenGodRelation): boolean {
  return relationEntry(rel).peopleRank === 1;
}

export interface StrengthAdjustment {
  /** 처방을 조정해야 하는가 */
  needed: boolean;
  /** 조정 사유 (재다신약) */
  reason: string | null;
  /**
   * 재성보다 먼저 제시할 오행 — 비겁(일간과 같은 오행)과 인성(일간을 생하는 오행).
   * 일간이 약한데 재성만 채우면 오히려 짐이 되므로 일간부터 세운다.
   */
  preferFirst: Element[];
}

/**
 * 일간 강약 연동 (§9). 재성 부족은 일간이 튼튼해야 감당된다 — 일간이 약한데 재성만
 * 채우면 재다신약이 되어 오히려 짐이 된다. 엔진이 `strength`를 이미 주므로 그대로 쓴다.
 */
export function adjustForStrength(
  rel: TenGodRelation,
  dayElement: Element,
  strength: StrengthResult
): StrengthAdjustment {
  const entry = relationEntry(rel);
  if (!entry.requiresStrengthCheck || strength.is_strong) {
    return { needed: false, reason: null, preferFirst: [] };
  }
  // 인성 = 일간을 생하는 오행
  let inseong: Element = dayElement;
  for (const [k, v] of Object.entries(C.GENERATES) as [Element, Element][]) {
    if (v === dayElement) inseong = k;
  }
  return {
    needed: true,
    reason: `일간이 ${strength.verdict}이라 재성을 감당할 힘이 부족하다(재다신약). 재성 항목을 줄이고 비겁·인성 계열을 먼저 세운다.`,
    preferFirst: [dayElement, inseong],
  };
}

/** 부족 오행을 가진 상대의 일간 조건 — 그 관계가 어떻게 작동하는지까지 함께 낸다 */
export function partnerGuide(dayElement: Element, target: Element) {
  const rel = computeRelation(dayElement, target);
  return { relation: rel, ...relationDict.people.byDayStem.rows[rel] };
}

/**
 * §④ 관계 유형별 적용에 붙이는 인물 묘사(2문장). el은 이번 리포트에서 찾는
 * 오행(부족 오행, follow형이면 dominant) — 없으면(이론상 발생 안 함) null.
 */
export function personaFor(el: Element): string {
  return relationDict.people.elementPersona[el];
}

/** 관찰로 추정하는 블록(§3-⑤) — 톤 규칙과 안내 문구가 반드시 함께 나가야 한다 */
export function observationGuide(highlight: Element | null) {
  const o = relationDict.people.observation;
  return {
    note: o.note,
    toneRule: o.toneRule,
    /** highlight(내게 필요한 기운)를 강조하고 나머지는 참고로 둔다 */
    rows: (Object.keys(o.rows) as Element[]).map((el) => ({
      element: el,
      elementKr: C.ELEMENT_KR[el],
      traits: o.rows[el],
      emphasized: el === highlight,
    })),
    mustInclude: o.mustInclude,
  };
}

/** 축 키가 A층 사전의 축과 어긋나지 않는지 확인용 (테스트에서 씀) */
export function isKnownAxis(a: string): a is Axis {
  return (AXES as string[]).includes(a);
}

// ── B층 노출 방식 A안 (CEO 확정 2026-08-31) ─────────────────────────
// relation.json 5개 관계 블록을 LLM 재생성 없이 그대로 노출한다. B층은 애초에
// "50조합 → 5가지 압축"이 설계 의도라 개인화 대상이 아니다 — 개인화는 A층 선정·
// 3년 세운·한 줄 진단이 담당한다. 명리 용어가 섞인 문장을 LLM이 재작성하면 오행
// 관계 자체가 틀릴 위험이 있고, 호출이 줄어 원가도 낮아진다.

/**
 * 블록 앞에 붙는 1문장 템플릿. "이며"는 오행명이 한자+한글 표기(예: "수(水)")로
 * 끝나 받침 유무와 무관하게 항상 붙는 표준형이라 조사 분기가 필요 없다(다른 문장의
 * "이/가"·"은/는"과 달리 "이다" 자체는 받침에 따라 형태가 바뀌지 않는다).
 */
export function buildRelationIntroLine(dayElement: Element, deficientElement: Element): string {
  const rel = computeRelation(dayElement, deficientElement);
  const deficientLabel = `${C.ELEMENT_KR[deficientElement]}(${deficientElement})`;
  const dayLabel = `${C.ELEMENT_KR[dayElement]}(${dayElement}) 일간`;
  return `당신에게 부족한 오행은 ${deficientLabel}이며, ${dayLabel}에게 ${rel}에 해당합니다.`;
}

/** 화면·프롬프트에 그대로 노출해도 되는 필드만 담은 블록. writerNote는 여기 없다 */
export interface RelationDisplayBlock {
  relation: TenGodRelation;
  label: string;
  keyword: string;
  /** buildRelationIntroLine()의 1문장 */
  intro: string;
  deficiency: string;
  symptoms: string[];
  whenFilled: string;
  caution: string;
}

/**
 * relation.json에서 노출 가능한 필드만 골라 반환한다. **B층을 렌더링하거나 프롬프트에
 * 넣을 때는 항상 이 함수를 거칠 것** — `relationEntry()`나 `relationDict`를 직접
 * 스프레드(`{...entry}`)하면 writerNote가 같이 섞여 나갈 수 있다. 이 함수가 그 경로를
 * 원천 차단한다(테스트로 writerNote 키 자체가 없는지 확인).
 */
export function buildRelationDisplayBlock(dayElement: Element, deficientElement: Element): RelationDisplayBlock {
  const rel = computeRelation(dayElement, deficientElement);
  const e = relationEntry(rel);
  return {
    relation: rel,
    label: e.label,
    keyword: e.keyword,
    intro: buildRelationIntroLine(dayElement, deficientElement),
    deficiency: e.deficiency,
    symptoms: e.symptoms,
    whenFilled: e.whenFilled,
    caution: e.caution,
  };
}
