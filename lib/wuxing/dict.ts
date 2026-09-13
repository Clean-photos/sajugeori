/**
 * dict.ts — A층 오행 고정 사전 로더 (§10-2).
 *
 * 사전 본문은 `dict.json`이며 LLM이 생성하지 않는다. 오방색·오미 배속을 LLM에 맡기면
 * 틀릴 여지가 생기고, 사전을 고치면 전 유저에게 즉시 반영되는 이점도 사라진다.
 *
 * 자사 콘텐츠(`/guide/fill-*` 5편)와 전수 대조를 마친 판본이다(2026-08-31).
 */
import dictJson from "./dict.json";
import type { Element } from "@/lib/saju-engine/constants";

export type Strength = "A" | "B" | "C";
export type Axis = "color" | "direction" | "food" | "material" | "habit" | "environment";

export const AXES: Axis[] = ["color", "direction", "food", "material", "habit", "environment"];

export interface DictItem {
  item: string;
  basis: string;
  action: string;
  strength: Strength;
}

/** 설기(덜어내기) 항목 — 실행란 없이 항목·근거·강도만 있다 */
export interface DrainItem {
  item: string;
  basis: string;
  strength: Strength;
}

export interface ElementAttributes {
  color: string;
  direction: string;
  season: string;
  /** 토는 특정 시간대에 대응하지 않는다 */
  time: string | null;
  taste: string;
  nature: string;
  virtue: string;
  stems: string[];
}

export interface DrainBlock {
  /**
   * "self" = 이 오행 자체가 과다할 때의 설기. 5오행 모두 가진다.
   * "companion-fire" = 수편 전용 `companionDrain`. 수 부족에 화 과다가 동반될 때의
   *   처방이라 성격이 다르다 — 과다 오행 설기로 오용하면 안 된다.
   */
  scope: "self" | "companion-fire";
  target: Element;
  principle: string;
  items: DrainItem[];
}

export interface ElementDict {
  label: string;
  attributes: ElementAttributes;
  /** 이 오행을 생해 주는 오행 — 직접 채우기가 어려울 때 함께 쓰면 효과가 안정적이다 */
  supportElement: Element;
  supportNote: string;
  axes: Record<Axis, DictItem[]>;
  /** 이 오행이 과다할 때의 설기 — 5오행 모두 가진다 */
  drain: DrainBlock;
  /**
   * 수편에만 있는 별도 블록. 수 부족은 화 과다와 동반되는 경우가 많아, 채우는 것만으로는
   * 부족할 때 쓰는 화 설기 처방이다. 수가 과다할 때 쓰는 것이 아니다.
   */
  companionDrain?: DrainBlock;
}

export interface WuxingDict {
  version: number;
  source: string;
  note: string;
  disclaimer: string;
  strengthLegend: Record<Strength, string>;
  axisLabels: Record<Axis, string>;
  elements: Record<Element, ElementDict>;
}

export const dict = dictJson as unknown as WuxingDict;

export function elementDict(el: Element): ElementDict {
  return dict.elements[el];
}

export function axisItems(el: Element, axis: Axis): DictItem[] {
  return dict.elements[el].axes[axis];
}

/**
 * 축에서 상위 n개만 뽑는다 (§5 A층 압축 — 6축 전량 나열 금지).
 *
 * 사전의 배열 순서가 곧 편집자가 매긴 우선순위다(1번이 그 축의 대표 항목). 정렬을 하지
 * 않고 앞에서부터 자르는 것이 기본값인 이유다. `byStrength`를 켜면 근거가 강한 항목
 * (A>B>C)을 앞으로 당기되, 같은 강도 안에서는 원래 순서를 유지한다.
 */
export function pickAxisItems(
  el: Element,
  axis: Axis,
  limit: number,
  opts: { byStrength?: boolean } = {}
): DictItem[] {
  const items = axisItems(el, axis);
  if (!opts.byStrength) return items.slice(0, limit);
  const rank: Record<Strength, number> = { A: 0, B: 1, C: 2 };
  return [...items]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank[a.it.strength] - rank[b.it.strength] || a.i - b.i)
    .slice(0, limit)
    .map(({ it }) => it);
}

/** 사전 전체 항목 수 (6축 + 설기). 검증·리포트 헤드라인용 */
export function totalItemCount(): number {
  return (Object.keys(dict.elements) as Element[]).reduce((sum, el) => {
    const d = dict.elements[el];
    return sum + AXES.reduce((s, ax) => s + d.axes[ax].length, 0) + d.drain.items.length;
  }, 0);
}

/** 한 오행이 가진 항목 수 (6축만, 설기 제외) */
export function elementItemCount(el: Element): number {
  const d = dict.elements[el];
  return AXES.reduce((s, ax) => s + d.axes[ax].length, 0);
}

/**
 * §4(CoS 실물 확인, 2026-09-08): seun-prescription.ts의 "우선 항목"(채우세요 목록)
 * 후보가 강도(A>B>C) 순으로 재정렬되면서, 같은 축의 "줄이기" 계열 항목(예: 金의
 * color축 "붉은 계열 면적 줄이기", strength B)이 dedup으로 상위 항목이 소진된
 * 3년차에 자연스럽게 순번을 타고 올라와 "우선 항목"에 노출됐다 — D케이스 전용
 * 주입이 아니라 축 풀 자체에 회피 문구가 섞여 있어서 생기는 문제라 export해서
 * priorityPool의 후보 풀에서도 걸러낸다.
 */
export const AVOID_PATTERN = /줄이기|회피|자제|피하기/;

/**
 * §3(P4, CEO 결정 2026-09-05): A층 사전엔 "밝은 하늘색·청록은 수가 아닙니다",
 * "짠맛은 미미하게만"처럼 오해 방지용 부정형·주의 문구가 섞여 있다. 위
 * AVOID_PATTERN이 잡는 "줄이기/회피/자제/피하기" 같은 명시적 회피 행동과는
 * 다른 카테고리다 — 이건 "하지 마세요"가 아니라 "이건 효과가 없다/과하면
 * 안 된다"는 설명이라, "채우세요/우선하세요" 류 목록에 섞이면 표제와 내용이
 * 반대로 읽힌다. seun-prescription.ts(3년 우선 항목)와 report.ts(신약 조정
 * 채우기 목록) 둘 다 이 패턴으로 걸러낸다 — 한쪽만 고치면 같은 사고가
 * 반복되므로 공용으로 둔다.
 *
 * §4(CoS 실물 확인, 2026-09-08): "매운맛은 향신료 수준으로만"이 위 패턴 어디에도
 * 안 걸려 그대로 3년 우선 항목에 나갔다 — "~수준으로만/정도로만"도 같은
 * "이 정도까지만 허용"류 캐비어트 문구라 패턴에 추가한다(사전 전수 확인 결과
 * "으로만"이 들어간 항목은 이 1건뿐 — 다른 정상 문구를 오탐할 위험 없음).
 */
export const CAVEAT_PATTERN = /아닙니다|아님|않게|미미하게만|으로만/;

/**
 * §2(CoS 실물 확인, 2026-09-08): "환경" 축 항목 중 일부는 그 오행 자체의 속성을
 * 그대로 옮긴 문구라("금은 조燥의 성질" → "건조한 환경 유지") 사주 전체의
 * 조후(계절 한난조습) 판정과 정반대 방향을 권할 수 있다. 실측: 부족 오행이 金인
 * 燥熱(덥고 건조) 사주에서 "건조한 환경 유지"가 그대로 "채우세요" 목록에 올라감
 * — 이미 덥고 건조한 사람에게 "더 건조하게 하세요"라고 말하는 셈이라 조후 원리와
 * 충돌한다.
 *
 * 사전이 6축×5오행 30개뿐인 "환경" 항목 전체라, 정규식보다 온도·습도 방향이
 * 명확한 항목만 명시적으로 골라 두는 편이 더 정확하고 감사하기 쉽다(모호한
 * 항목—"밝은 조명", "안정된 온도 유지" 등—은 포함하지 않았다: 이 항목들은 조후
 * 판정과 직접 충돌한다고 보기 어렵다).
 *
 *   덥고 건조(燥熱) 사주 — 필요: 서늘함·습기. "따뜻하게/건조하게"류가 충돌.
 *   춥고 습함(寒濕) 사주 — 필요: 따뜻함·건조함. "서늘하게/습하게"류가 충돌.
 *
 * §C-3(CoS 실물 재검증, 2026-09-11): 이름은 "ENV_"지만 conflictsWithClimate는
 * report.ts/seun-prescription.ts에서 환경 축뿐 아니라 전 축(색·음식·방향·재료·
 * 습관·환경)에 공통 적용된다 — 그래서 음식 축 항목도 여기 등록될 수 있다.
 * 실측: 燥熱 사주(부족 오행 金)의 2027년(丁未, 火가 드는 해) 세운 우선 항목에
 * "매운맛(생강·마늘·양파·후추)"이 그대로 올라감 — 매운맛은 몸을 덥히는 성질이라
 * 이미 덥고 건조한 사람에게 더 열을 올리라는 셈이 되어 조후 원리와 충돌한다
 * (같은 오행의 "매운맛은 향신료 수준으로만" 항목은 CAVEAT_PATTERN의 "으로만"에
 * 걸려 이미 정상적으로 필터링되고 있었다 — 이번에 새는 건 그 캐비어트 없는
 * 별도 항목이었다).
 */
export const ENV_CLIMATE_CONFLICT: Record<string, string[]> = {
  "따뜻한 실내 온도": ["덥고 건조(燥熱)"],
  "남향 창 확보": ["덥고 건조(燥熱)"],
  "건조한 환경 유지": ["덥고 건조(燥熱)"],
  "서늘한 실내 온도": ["춥고 습함(寒濕)"],
  "실내 습도 확보": ["춥고 습함(寒濕)"],
  "매운맛 (생강·마늘·양파·후추)": ["덥고 건조(燥熱)"],
};

/** 이 항목이 이 사주의 조후 판정과 정반대 방향을 권하는가(§2). */
export function conflictsWithClimate(item: string, climate: string): boolean {
  return ENV_CLIMATE_CONFLICT[item]?.includes(climate) ?? false;
}

/**
 * §4-1(CoS+CEO 실물 확인, 2026-09-08): 각 오행의 supportElement(직접 채우기
 * 어려울 때 함께 쓰면 좋은 오행 — 언제나 그 오행의 생성자, 예: 木의
 * supportElement=水)는 조후와 무관하게 고정돼 있다. 부족 오행이 木인 寒濕
 * (춥고 습함) 사주에 "水를 함께 쓰면 안정적"이라고 권하면, 이미 습한 사주에
 * 물을 더 얹는 셈이라 조후와 정반대다(실측).
 *
 * lib/saju-engine/engine.ts가 조후를 판정할 때 쓰는 두 johu 페어({水,金}=
 * 燥熱용, {火,木}=寒濕용)는 서로 배타적인 세트다(계산 엔진 무접촉 — 엔진이
 * 이미 산출한 두 페어를 그대로 인용만 한다). 그래서 "반대 계절의 페어에
 * 속한다"가 곧 "이 조후를 악화시킨다"와 같다.
 */
const OPPOSITE_JOHU_PAIR: Record<string, Element[]> = {
  "덥고 건조(燥熱)": ["火", "木"],
  "춥고 습함(寒濕)": ["水", "金"],
};

/** supportElement 제안이 이 사주의 조후와 정반대 방향인가(§4-1). */
export function supportElementConflictsWithClimate(supportEl: Element, climate: string): boolean {
  return OPPOSITE_JOHU_PAIR[climate]?.includes(supportEl) ?? false;
}

/**
 * "~줄이기·~회피" 계열 항목만 6축 전체에서 모은다 (세운 처방 §1-6 "피할 것" 소스).
 * 어느 오행에나 6개 안팎 있어 limit=2를 채우기에 항상 충분하다(검증됨).
 */
export function avoidanceItems(el: Element, limit: number): DictItem[] {
  const out: DictItem[] = [];
  for (const ax of AXES) {
    for (const it of dict.elements[el].axes[ax]) {
      if (AVOID_PATTERN.test(it.item)) out.push(it);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
