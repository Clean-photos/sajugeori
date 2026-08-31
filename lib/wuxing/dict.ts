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
   * "self" = 이 오행 자체가 과다할 때의 설기.
   * "companion-fire" = 수편 전용. 수 부족에 화 과다가 동반될 때의 처방이라 성격이 다르다.
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
  drain: DrainBlock;
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
