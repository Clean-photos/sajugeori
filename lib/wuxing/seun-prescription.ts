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
 * 케이스 우선순위(문서 §1-3) — 숫자가 작을수록 우선한다. classifySingle이 이
 * 순서와 정확히 같은 순서로 조건을 검사하므로, RANK는 그 검사 순서를 그대로
 * 숫자로 옮긴 것이다(동치 증명은 classifySeunCaseDetail 주석 참고).
 */
const RANK: Record<SeunCase, number> = { A: 0, B: 1, D: 2, C: 3, E: 4 };

/** 오행 하나만으로 케이스를 가른다 — 천간·지지를 각각 판정하기 위한 단위 함수. */
function classifySingle(el: Element, primary: Element | null, excessive: Element[]): SeunCase {
  if (primary && el === primary) return "A"; // Y = L
  if (excessive.includes(el)) return "B"; // Y = X
  if (primary && C.CONTROLS[el] === primary) return "D"; // Y 극 L
  if (primary && C.GENERATES[el] === primary) return "C"; // Y 생 L
  return "E";
}

export interface SeunCaseDetail {
  /** 최종(주) 케이스 */
  case: SeunCase;
  stemCase: SeunCase;
  branchCase: SeunCase;
  /** 천간·지지 판정이 다른가 — true면 서술에 두 축을 각각 반영해야 한다(§2) */
  diverges: boolean;
  /** 갈릴 때, 최종 케이스를 만든 축. 갈리지 않으면 둘 다 같은 값이므로 "both" */
  matchedAxis: "stem" | "branch" | "both";
}

/**
 * 세운을 천간·지지 2축으로 각각 판정한다(§2, CEO 결정 2026-09-02).
 *
 * ⚠️ 이전 버전은 "천간·지지 오행을 모은 배열(yElements)에서 OR로 검사"했는데,
 * 결과적으로 이 새 버전과 최종 case가 항상 같다 — OR 검사도 우선순위 순서
 * (A→B→D→C→E)대로 배열 전체를 훑고 먼저 맞는 것을 반환하므로, "두 축 중 더
 * 높은 우선순위(더 작은 RANK)를 가진 축을 채택"하는 것과 수학적으로 동일하다.
 * 그래서 classifySeunCase()의 반환값은 이전과 100% 동일하고, 기존 테스트가
 * 그대로 통과한다 — 이번 변경은 판정 로직이 아니라 **판정 근거(어느 축이
 * 왜 그 케이스를 만들었는지)를 노출**하는 것이다. 이게 있어야 "천간은
 * 중립이나 지지에서 부족한 기운이 들어온다" 같은 축별 서술이 가능해진다.
 *
 * E는 stemCase·branchCase가 **둘 다** E일 때만 나온다 — 한쪽이라도 A/B/C/D면
 * RANK가 E(4)보다 작아 그쪽이 채택되기 때문이다(문서 §2 규칙 4와 일치).
 */
export function classifySeunCaseDetail(
  yearStemEl: Element,
  yearBranchEl: Element,
  primary: Element | null,
  excessive: Element[]
): SeunCaseDetail {
  const stemCase = classifySingle(yearStemEl, primary, excessive);
  const branchCase = yearStemEl === yearBranchEl ? stemCase : classifySingle(yearBranchEl, primary, excessive);

  if (stemCase === branchCase) {
    return { case: stemCase, stemCase, branchCase, diverges: false, matchedAxis: "both" };
  }
  const finalCase = RANK[stemCase] < RANK[branchCase] ? stemCase : branchCase;
  return {
    case: finalCase,
    stemCase,
    branchCase,
    diverges: true,
    matchedAxis: finalCase === stemCase ? "stem" : "branch",
  };
}

/** 기존 호출부·테스트 호환용 — 최종 케이스만 필요하면 이걸 쓴다. */
export function classifySeunCase(
  yearStemEl: Element,
  yearBranchEl: Element,
  primary: Element | null,
  excessive: Element[]
): SeunCase {
  return classifySeunCaseDetail(yearStemEl, yearBranchEl, primary, excessive).case;
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
  /** 천간·지지 판정이 갈렸는가(§2) */
  divergesByAxis: boolean;
  /**
   * 갈렸을 때만 채워지는 축별 서술 — "지지는 특별한 영향이 없고, 천간에서
   * 부족한 것이 직접 들어옵니다" 형태. 갈리지 않으면 null(본문에 덧붙일 게 없다).
   */
  axisNote: string | null;
  /** 케이스별 고정 풀에서 뽑은 "올해의 상태" — 3년 안에서 중복되지 않는다(§3) */
  statusLine: string;
  /** A층 사전에서 뽑은 우선 항목 3개 — 3년 9개가 서로 겹치지 않는다(§3) */
  priorityItems: DictItem[];
  /** A층 사전에서 뽑은 피할 것 2개 — 3년 6개가 서로 겹치지 않는다(§3) */
  avoidItems: DictItem[];
  /** 케이스별 고정 풀에서 뽑은 "한 줄 지침" — 3년 안에서 중복되지 않는다(§3) */
  guidelineLine: string;
}

// C: "행동·환경 축 우선" — 둘 다 앞으로. E: "행동 축 우선" — 행동만 앞으로.
const habitEnvFirst: Axis[] = ["habit", "environment", "color", "direction", "food", "material"];
const habitFirst: Axis[] = ["habit", "color", "direction", "food", "material", "environment"];

/**
 * §3(CEO 결정 2026-09-05, 실물 확인): A층 사전엔 "밝은 하늘색·청록은 수가
 * 아닙니다", "짠맛은 미미하게만"처럼 오해 방지용 부정형·주의 문구가 섞여
 * 있다. dict.ts의 avoidanceItems()가 잡는 "줄이기/회피/자제/피하기" 같은
 * 명시적 회피 행동과는 다른 카테고리다 — 이건 "하지 마세요"가 아니라 "이건
 * 효과가 없다/과하면 안 된다"는 설명이라, "올해 우선할 것" 아래 놓이면
 * 표제와 내용이 정반대로 읽힌다("피할 것" 자리엔 원래도 안 쓰인다 — 그쪽은
 * avoidanceItems 별도 풀). 우선 항목 후보에서만 걸러낸다.
 */
const CAVEAT_PATTERN = /아닙니다|아님|않게|미미하게만/;

/** order 순서대로 그 오행의 전체 항목을 모은다(슬라이스하지 않는다 — 중복 제거용 큰 후보군이 필요해서). */
function collectByAxisOrderFull(el: Element, order: Axis[], byStrength = false): DictItem[] {
  const pool: DictItem[] = [];
  for (const ax of order) pool.push(...axisItems(el, ax).filter((it) => !CAVEAT_PATTERN.test(it.item)));
  if (!byStrength) return pool;
  const rank: Record<string, number> = { A: 0, B: 1, C: 2 };
  return [...pool]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank[a.it.strength] - rank[b.it.strength] || a.i - b.i)
    .map(({ it }) => it);
}

/** DrainItem(실행란 없음)을 DictItem 모양으로 맞춘다 — action은 원리 문구로 대체 */
function dictDrainAsItems(el: Element): DictItem[] {
  const entry = elementDict(el);
  return entry.drain.items.map((it) => ({ item: it.item, basis: it.basis, action: entry.drain.principle, strength: it.strength }));
}

/**
 * used에 없는 것부터 count개를 뽑는다. 겹치는 것부터 쓰지 않지만, "3개(또는
 * 2개) 항상 보장"이 dedup보다 우선이라 pool 자체가 모자라면(예: 케이스 B가
 * 3년 내내 반복되는데 설기 항목은 오행당 5개뿐인 경우) 남은 자리는 이미 쓴
 * 항목이라도 채운다 — §3이 요구하는 "9개 서로 안 겹침"은 pool이 허락하는
 * 한도 안에서의 목표이지, 항목 개수 자체를 줄이는 명분이 될 수 없다.
 */
function pickUniqueItems(pool: DictItem[], count: number, used: Set<string>): DictItem[] {
  const picked: DictItem[] = [];
  for (const it of pool) {
    if (picked.length >= count) break;
    if (used.has(it.item)) continue;
    picked.push(it);
  }
  if (picked.length < count) {
    for (const it of pool) {
      if (picked.length >= count) break;
      if (picked.some((p) => p.item === it.item)) continue;
      picked.push(it);
    }
  }
  for (const it of picked) used.add(it.item);
  return picked;
}

/**
 * 우선 항목 후보군(중복 제거 전, 큰 풀) — 케이스마다 기준이 다르다:
 *   A 부족 보충, 강도 A·B 우선 — 효과가 확실한 것부터
 *   B 과다 오행 설기 항목 우선 — 보충보다 설기(모자라면 그 오행 나머지 축으로 이어서)
 *   C 부족 보충, 행동·환경 축 우선 — 습관화가 잘 되는 시기
 *   D 부족 보충(강도 우선) + 과다 회피 항목 최대 1개
 *   E 부족 보충, 행동 축 우선 — 루틴 정착
 *
 * primary(부족 오행)가 없으면(균형형) 과다 오행 쪽으로 폴백한다 — 상품이 빈손으로
 * 끝나지 않도록 하는 것이 §3-⑤의 요구다.
 */
function priorityPool(seunCase: SeunCase, cls: Classification, dominantExcess: Element | null, used: Set<string>): DictItem[] {
  const primary = cls.primary;
  const excessEl = dominantExcess ?? cls.excessive[0] ?? cls.dominant ?? null;

  if (seunCase === "B") {
    if (!excessEl) return primary ? collectByAxisOrderFull(primary, AXES, true) : [];
    // 설기 항목(오행당 5개)이 3년 반복에 부족할 수 있어, 소진되면 그 오행의
    // 나머지 축(AXES)으로 이어서 후보를 늘린다 — 여전히 "그 오행에 대한
    // 처방"이라 주제는 벗어나지 않는다.
    return [...dictDrainAsItems(excessEl), ...collectByAxisOrderFull(excessEl, AXES, true)];
  }

  if (!primary) {
    // 균형형 — 부족이 없다. 과다 오행 설기로 폴백
    return excessEl ? [...dictDrainAsItems(excessEl), ...collectByAxisOrderFull(excessEl, AXES, true)] : [];
  }

  if (seunCase === "C") return collectByAxisOrderFull(primary, habitEnvFirst);
  if (seunCase === "E") return collectByAxisOrderFull(primary, habitFirst);
  if (seunCase === "D") {
    // 회피 항목은 최대 1개만 섞는다(원래 규칙 유지) — 매년 그 해에 아직 안 쓴
    // 회피 항목 중 첫 번째를 고르고, 나머지는 강도 우선 AXES로 채운다.
    const avoidPool = excessEl ? avoidanceItems(excessEl, 20) : [];
    const bestAvoid = avoidPool.find((a) => !used.has(a.item)) ?? avoidPool[0] ?? null;
    const axesPool = collectByAxisOrderFull(primary, AXES, true).filter((it) => !bestAvoid || it.item !== bestAvoid.item);
    return bestAvoid ? [bestAvoid, ...axesPool] : axesPool;
  }
  // A — 강도 A·B 우선
  return collectByAxisOrderFull(primary, AXES, true);
}

function pickPriorityItems(seunCase: SeunCase, cls: Classification, dominantExcess: Element | null, used: Set<string>): DictItem[] {
  const pool = priorityPool(seunCase, cls, dominantExcess, used);
  return pickUniqueItems(pool, 3, used);
}

function pickAvoidItems(cls: Classification, dominantExcess: Element | null, used: Set<string>): DictItem[] {
  const excessEl = dominantExcess ?? cls.excessive[0] ?? cls.dominant ?? null;
  if (!excessEl) return [];
  const pool = avoidanceItems(excessEl, 20);
  return pickUniqueItems(pool, 2, used);
}

/** 축 하나의 케이스를 짧게 요약 — 갈린 두 축을 한 문장에 엮을 때 쓴다. */
const CASE_BRIEF: Record<SeunCase, string> = {
  A: "부족한 기운이 직접 들어오고",
  B: "이미 많은 기운이 더해지고",
  C: "부족한 것을 도와주는 기운이 들어오고",
  D: "부족한 것을 치는 기운이 들어오고",
  E: "특별한 영향이 없고",
};
const AXIS_LABEL = { stem: "천간", branch: "지지" } as const;
// "천간"은 받침 있음(은) / "지지"는 받침 없음(는) — 두 값뿐이라 josa.ts의 오행
// 5개짜리 표를 끌어오는 대신 이 자리에서 고정한다.
const AXIS_LABEL_EUN_NEUN = { stem: "천간은", branch: "지지는" } as const;

/**
 * 천간·지지 판정이 갈렸을 때만 쓰는 서술(§2) — "지지는 특별한 영향이 없고,
 * 천간에서 부족한 것이 직접 들어옵니다" 형태. 고정 조합(2×5가지 CASE_BRIEF ×
 * conditionNote)이라 LLM 없이 결정적으로 만든다.
 */
function buildAxisNote(detail: SeunCaseDetail, matchedConditionNote: string): string | null {
  if (!detail.diverges) return null;
  const otherAxis: "stem" | "branch" = detail.matchedAxis === "stem" ? "branch" : "stem";
  const otherCase = otherAxis === "stem" ? detail.stemCase : detail.branchCase;
  return `${AXIS_LABEL_EUN_NEUN[otherAxis]} ${CASE_BRIEF[otherCase]}, ${AXIS_LABEL[detail.matchedAxis as "stem" | "branch"]}에서 ${matchedConditionNote}`;
}

/**
 * 3년(또는 그 이상) 안에서 같은 문구가 반복되지 않도록 뽑는다(§3). pool이
 * 해에 필요한 개수보다 항상 크므로(6 ≥ 3) 소진 걱정 없이 매번 새 문구가 나온다.
 * 시드에 연도를 포함해 같은 케이스라도 해마다 시작 인덱스가 달라지게 하고,
 * 그 지점부터 순서대로 훑어 아직 안 쓴 첫 문구를 채택한다 — 결정적이다.
 */
function pickUniqueText(pool: string[], seed: string, used: Set<string>): string {
  const start = pickIndex(seed, pool.length);
  for (let k = 0; k < pool.length; k++) {
    const text = pool[(start + k) % pool.length];
    if (!used.has(text)) {
      used.add(text);
      return text;
    }
  }
  // pool 전체가 이미 다 쓰였을 때만(3년 구조에서는 발생하지 않는다) 원래 선택으로 폴백
  const fallback = pool[start];
  used.add(fallback);
  return fallback;
}

/** 3년치를 순서대로 조립할 때 축적되는 "이미 쓴 것" 상태 — §3의 중복 방지 단위. */
interface DedupState {
  usedPriorityItems: Set<string>;
  usedAvoidItems: Set<string>;
  usedStatus: Set<string>;
  usedGuideline: Set<string>;
}

function buildYearPrescription(y: SeunYear, cls: Classification, state: DedupState): YearPrescription {
  const incoming = y.stemElement === y.branchElement ? [y.stemElement] : [y.stemElement, y.branchElement];
  const detail = classifySeunCaseDetail(y.stemElement, y.branchElement, cls.primary, cls.excessive);
  const seunCase = detail.case;
  const copy = seunCopy.cases[seunCase];

  const seed = `${y.year}|${seunCase}`;
  const statusLine = pickUniqueText(copy.status, seed + "status", state.usedStatus);
  const guidelineLine = pickUniqueText(copy.guideline, seed + "guideline", state.usedGuideline);

  const dominantExcess = cls.excessive.find((e) => incoming.includes(e)) ?? null;
  const incomingLine = `${incoming.map((e) => `${e}(${C.ELEMENT_KR[e]})`).join("·")} — ${copy.conditionNote}`;

  return {
    year: y.year,
    ganji: y.ganji,
    incoming,
    seunCase,
    caseLabel: copy.label,
    incomingLine,
    divergesByAxis: detail.diverges,
    axisNote: buildAxisNote(detail, copy.conditionNote),
    statusLine,
    priorityItems: pickPriorityItems(seunCase, cls, dominantExcess, state.usedPriorityItems),
    avoidItems: pickAvoidItems(cls, dominantExcess, state.usedAvoidItems),
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
  // §5(CEO 결정 2026-09-05): 교체 여부와 무관하게 현재 대운은 항상 표기하고,
  // 전환은 있을 때만 부가로 붙인다 — 이전엔 둘이 상호 배타적이라 교체가 있는
  // 표본은 "지금 어느 대운인지"를 아예 안 알려줬다.
  return {
    background: plan.backgroundDaewoon ? `지금은 ${plan.backgroundDaewoon.ganji} 대운 안입니다` : null,
    transition: plan.transition ? `${plan.transition.aroundAge}세 무렵 대운이 ${plan.transition.toGanji}로 바뀝니다` : null,
  };
}

/**
 * 올해 포함 3년치 세운 처방을 낸다. `buildSeunPlan()`(엔진 무접촉 세운 래퍼) 위에
 * 5케이스 판정 + A층 사전 연결을 얹는다. 3년을 관통하는 흐름 한 문단은 LLM이
 * 붙이므로 이 함수의 반환값에는 없다 — 호출부에서 `years`를 프롬프트에 주입한다.
 *
 * §3(연도 간 중복 금지, CEO 결정 2026-09-02): 우선 항목·피할 것·상태·지침이
 * 3년 내내 서로 겹치지 않아야 한다. `.map()`으로 각 해를 독립적으로 만들면
 * 케이스가 같은 두 해가 완전히 같은 결과를 내므로(실측으로 확인한 실제 버그),
 * 연도 오름차순으로 **순차 처리**하며 "이미 쓴 것"을 하나의 DedupState에
 * 누적한다 — 결정성은 그대로 유지된다(같은 명식·같은 fromYear면 항상 같은
 * 순서로 같은 결과가 나온다).
 */
export function buildSeunPrescription(
  chart: SajuChart,
  cls: Classification,
  fromYear?: number
): SeunPrescriptionPlan {
  const plan = buildSeunPlan(chart, cls, fromYear);
  const state: DedupState = {
    usedPriorityItems: new Set(),
    usedAvoidItems: new Set(),
    usedStatus: new Set(),
    usedGuideline: new Set(),
  };
  const years = plan.years.map((y) => buildYearPrescription(y, cls, state));
  return { years, daewoonNote: buildDaewoonNote(plan) };
}
