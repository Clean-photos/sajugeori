/**
 * seun-prescription.ts — 3년 세운 처방 규격 (§10-5, docs/wuxing_seun_diagnosis_banner_v1.md §1).
 *
 * 세운 오행과 내 사주의 관계는 5가지 경우로 끝난다. **판정은 코드가 하고, 문구는 고정
 * 풀에서 뽑는다.** LLM에게 맡기지 않는다 — 매번 생성시키면 느리고 비싸고, 무엇보다
 * 오행 관계를 틀릴 여지가 생긴다. LLM은 3년을 관통하는 흐름 한 문단(2~3문장)만 붙인다.
 *
 * `scoreYear()`를 쓰지 않는다(§1-2) — 이미 `seun.ts`가 그 원칙을 지켜 간지·오행만 낸다.
 * 이 모듈은 그 위에 5케이스 판정과 A층 사전 연결을 얹는다.
 *
 * 계산 엔진 무접촉(하드룰 1).
 */
import seunCopyJson from "./seun-copy.json";
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import { type Classification } from "./classify";
import { buildSeunPlan, type SeunPlan, type SeunYear } from "./seun";
import { type DictItem, avoidanceItems, axisItems, elementDict, AXES, type Axis } from "./dict";

export type SeunCase = "A" | "B" | "C" | "D" | "E";

interface CaseCopy {
  label: string;
  conditionNote: string;
  status: string[];
  guideline: string[];
}

const seunCopy = seunCopyJson as { cases: Record<SeunCase, CaseCopy> };

/**
 * 세운 오행(그 해의 천간·지지 오행, 최대 2개)과 내 부족/과다 오행으로 케이스를 가른다.
 * 우선순위 A > B > D > C > E — 예: Y가 부족 오행이면서 동시에 과다 오행을 생하는
 * 경우에도 A로 판정한다(문서 §1-3 예시와 동일).
 *
 * primary(부족 오행)가 없는 사주(균형형)에서는 A·C·D가 성립할 수 없다 — L이 없으므로.
 * 이때는 B(과다 오행이 더 들어오는 해) 또는 E로만 갈린다.
 */
export function classifySeunCase(
  yearStemEl: Element,
  yearBranchEl: Element,
  primary: Element | null,
  excessive: Element[]
): SeunCase {
  const yElements = yearStemEl === yearBranchEl ? [yearStemEl] : [yearStemEl, yearBranchEl];

  if (primary && yElements.includes(primary)) return "A"; // Y = L
  if (yElements.some((y) => excessive.includes(y))) return "B"; // Y = X
  if (primary && yElements.some((y) => C.CONTROLS[y] === primary)) return "D"; // Y 극 L
  if (primary && yElements.some((y) => C.GENERATES[y] === primary)) return "C"; // Y 생 L
  return "E";
}

/** 결정적 선택 — 문자열 시드에서 0..len-1 인덱스를 뽑는다(FNV-1a 32bit) */
function pickIndex(seed: string, len: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h) % len;
}

export interface YearPrescription {
  year: number;
  ganji: string;
  /** 이 해에 들어오는 오행(천간·지지, 최대 2개) */
  incoming: Element[];
  seunCase: SeunCase;
  caseLabel: string;
  /** "화(火) — 부족한 것을 생해주는 기운이 들어온다" 형태의 한 줄 */
  incomingLine: string;
  /** 케이스별 고정 풀에서 뽑은 "올해의 상태" */
  statusLine: string;
  /** A층 사전에서 뽑은 우선 항목 3개 */
  priorityItems: DictItem[];
  /** A층 사전에서 뽑은 피할 것 2개 */
  avoidItems: DictItem[];
  /** 케이스별 고정 풀에서 뽑은 "한 줄 지침" */
  guidelineLine: string;
}

// C: "행동·환경 축 우선" — 둘 다 앞으로. E: "행동 축 우선" — 행동만 앞으로.
const habitEnvFirst: Axis[] = ["habit", "environment", "color", "direction", "food", "material"];
const habitFirst: Axis[] = ["habit", "color", "direction", "food", "material", "environment"];

function collectByAxisOrder(el: Element, order: Axis[], limit: number, byStrength = false): DictItem[] {
  const pool: DictItem[] = [];
  for (const ax of order) pool.push(...axisItems(el, ax));
  if (!byStrength) return pool.slice(0, limit);
  const rank: Record<string, number> = { A: 0, B: 1, C: 2 };
  return [...pool]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank[a.it.strength] - rank[b.it.strength] || a.i - b.i)
    .slice(0, limit)
    .map(({ it }) => it);
}

/**
 * 우선 항목 3개 선정 (§1-6). 케이스마다 기준이 다르다:
 *   A 부족 보충, 강도 A·B 우선 — 효과가 확실한 것부터
 *   B 과다 오행 설기 항목 우선 — 보충보다 설기
 *   C 부족 보충, 행동·환경 축 우선 — 습관화가 잘 되는 시기
 *   D 부족 보충 강도 A 우선 + 과다 회피 항목 1개 포함
 *   E 부족 보충, 행동 축 우선 — 루틴 정착
 *
 * primary(부족 오행)가 없으면(균형형) 과다 오행 쪽으로 폴백한다 — 상품이 빈손으로
 * 끝나지 않도록 하는 것이 §3-⑤의 요구다.
 */
function pickPriorityItems(seunCase: SeunCase, cls: Classification, dominantExcess: Element | null): DictItem[] {
  const primary = cls.primary;
  const excessEl = dominantExcess ?? cls.excessive[0] ?? cls.dominant ?? null;

  if (seunCase === "B") {
    if (!excessEl) return primary ? collectByAxisOrder(primary, AXES, 3, true) : [];
    // 설기 items는 DrainItem(실행란 없음)이라 DictItem 형태로 맞춰 action을 비워 반환
    return dictDrainAsItems(excessEl).slice(0, 3);
  }

  if (!primary) {
    // 균형형 — 부족이 없다. 과다 오행 설기로 폴백
    return excessEl ? dictDrainAsItems(excessEl).slice(0, 3) : [];
  }

  if (seunCase === "C") return collectByAxisOrder(primary, habitEnvFirst, 3);
  if (seunCase === "E") return collectByAxisOrder(primary, habitFirst, 3);
  if (seunCase === "D") {
    // 회피 1개를 끼워 넣을 과다 오행이 없으면(균형형에 가까운 사주) 3개 전부
    // 강도 우선으로 채운다 — "3개"가 항상 보장돼야 한다
    const avoid = excessEl ? avoidanceItems(excessEl, 1) : [];
    const filled = collectByAxisOrder(primary, AXES, 3 - avoid.length, true);
    return [...filled, ...avoid];
  }
  // A — 강도 A·B 우선
  return collectByAxisOrder(primary, AXES, 3, true);
}

/** DrainItem(실행란 없음)을 DictItem 모양으로 맞춘다 — action은 원리 문구로 대체 */
function dictDrainAsItems(el: Element): DictItem[] {
  const entry = elementDict(el);
  return entry.drain.items.map((it) => ({ item: it.item, basis: it.basis, action: entry.drain.principle, strength: it.strength }));
}

function pickAvoidItems(seunCase: SeunCase, cls: Classification, dominantExcess: Element | null): DictItem[] {
  const excessEl = dominantExcess ?? cls.excessive[0] ?? cls.dominant ?? null;
  if (!excessEl) return [];
  return avoidanceItems(excessEl, 2);
}

function buildYearPrescription(y: SeunYear, cls: Classification): YearPrescription {
  const incoming = y.stemElement === y.branchElement ? [y.stemElement] : [y.stemElement, y.branchElement];
  const seunCase = classifySeunCase(y.stemElement, y.branchElement, cls.primary, cls.excessive);
  const copy = seunCopy.cases[seunCase];

  const seed = `${y.year}|${seunCase}`;
  const statusLine = copy.status[pickIndex(seed + "status", copy.status.length)];
  const guidelineLine = copy.guideline[pickIndex(seed + "guideline", copy.guideline.length)];

  const dominantExcess = cls.excessive.find((e) => incoming.includes(e)) ?? null;
  const incomingLine = `${incoming.map((e) => `${e}(${C.ELEMENT_KR[e]})`).join("·")} — ${copy.conditionNote}`;

  return {
    year: y.year,
    ganji: y.ganji,
    incoming,
    seunCase,
    caseLabel: copy.label,
    incomingLine,
    statusLine,
    priorityItems: pickPriorityItems(seunCase, cls, dominantExcess),
    avoidItems: pickAvoidItems(seunCase, cls, dominantExcess),
    guidelineLine,
  };
}

export interface DaewoonNote {
  /** 3년 창에 교체가 없을 때 — "지금은 OO(간지) 대운 안입니다" */
  background: string | null;
  /**
   * 3년 창에 교체가 있을 때 — "OO세 무렵 대운이 OO(간지)로 바뀝니다".
   * 근사식 오차(±1~2년)가 있어 연도가 아니라 나이로만 표기한다(§1-7).
   */
  transition: string | null;
}

export interface SeunPrescriptionPlan {
  years: YearPrescription[];
  daewoonNote: DaewoonNote;
}

function buildDaewoonNote(plan: SeunPlan): DaewoonNote {
  if (plan.transition) {
    return {
      background: null,
      transition: `${plan.transition.aroundAge}세 무렵 대운이 ${plan.transition.toGanji}로 바뀝니다`,
    };
  }
  if (plan.backgroundDaewoon) {
    return { background: `지금은 ${plan.backgroundDaewoon.ganji} 대운 안입니다`, transition: null };
  }
  return { background: null, transition: null };
}

/**
 * 올해 포함 3년치 세운 처방을 낸다. `buildSeunPlan()`(엔진 무접촉 세운 래퍼) 위에
 * 5케이스 판정 + A층 사전 연결을 얹는다. 3년을 관통하는 흐름 한 문단은 LLM이
 * 붙이므로 이 함수의 반환값에는 없다 — 호출부에서 `years`를 프롬프트에 주입한다.
 */
export function buildSeunPrescription(
  chart: SajuChart,
  cls: Classification,
  fromYear?: number
): SeunPrescriptionPlan {
  const plan = buildSeunPlan(chart, cls, fromYear);
  return {
    years: plan.years.map((y) => buildYearPrescription(y, cls)),
    daewoonNote: buildDaewoonNote(plan),
  };
}
