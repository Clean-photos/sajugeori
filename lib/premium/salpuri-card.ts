/**
 * salpuri-card.ts — 프리미엄 살풀이 결과 최상단 요약 카드(명식 배치도형)의 데이터.
 *
 * CoS §C-2 ②: "어느 자리에 앉았는지 · 겹치는지"가 경쟁 무료 판정기가 못 하는 차별점이다.
 * chart에서 이미 계산된 값(pillars·sal)만 읽어 카드용으로 정리하는 순수 함수 —
 * 계산 엔진은 건드리지 않는다. 생년월일·시각 원본은 담지 않는다(카드는 단톡방에 그대로 공유된다).
 *
 * 2026-09-22(CEO 실물 확인): "월지 중첩·일지 중첩" 같은 자리 용어가 "그래서 좋다는 거야 뭐야"로
 * 안 읽혔고, "용신 후보"는 뭔지 모르겠다는 반응이었다 — 둘 다 걷어내고, 검출된 살들이 무슨 뜻인지를
 * 한 줄 결론(verdict)으로 낸다. 새 주장을 짓지 않고 constants.SAL_MEANING(이미 검증된 살풀이 리포트
 * 본문이 쓰는 표현)에서 살마다 핵심 어구만 뽑아 재사용한다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";

const POSITION_LABEL = ["연", "월", "일", "시"] as const;
const POSITION_KEY = ["연", "월", "일", "시"];

export interface SalpuriCardPillar {
  label: string; // 연·월·일·시
  /** 예: "丁" — 시각 모름이면 null */
  stem: string | null;
  branch: string | null;
  stemKr: string | null;
  branchKr: string | null;
}

export interface SalpuriCardOverlap {
  /** 예: "월지" (일주 자리는 "일지"로 통일) */
  position: string;
  names: string[];
}

export interface SalpuriCardData {
  /** 검출된 살 종류 수 — 기존 칩 문구("검출된 살 N종")와 같은 기준(이름 기준 중복 제거) */
  count: number;
  pillars: SalpuriCardPillar[]; // 연·월·일·시 순 4개
  /** pillars와 같은 순서 — 각 자리에 앉은 살 이름(표시용 짧은 이름) */
  marks: string[][];
  /** 한 자리에 살이 둘 이상 겹친 곳 — 카드에 문구로 노출하진 않고 자리 강조(테두리색)에만 쓴다 */
  overlaps: SalpuriCardOverlap[];
  /** "그래서 이게 뭘 뜻하는지" 한 줄 결론. 검출된 살이 없으면 null(카드 자체가 렌더되지 않음) */
  verdict: string | null;
}

/**
 * 살 이름 → 어떤 복/기운 축인지. constants.SAL_MEANING의 첫 어구를 그대로 재사용한다(신규 주장 없음).
 * 같은 축을 공유하는 살이 여럿이면(예: 도화살·홍염살) 한 문장에 함께 묶인다.
 * order는 여러 축이 동시에 검출됐을 때 어느 축을 대표로 낼지의 우선순위(앞쪽이 우선).
 */
const THEME_GROUPS: { label: string; members: string[] }[] = [
  { label: "귀인·행운", members: ["천을귀인"] },
  { label: "매력·인기", members: ["도화살", "홍염살"] },
  { label: "복록·품위", members: ["금여"] },
  { label: "총명함·학문운", members: ["문창귀인"] },
  { label: "이동·활동성", members: ["역마살"] },
  { label: "예술성·감수성", members: ["화개살"] },
  { label: "강한 추진력", members: ["양인살", "괴강살", "백호살"] },
  { label: "예민함·직관", members: ["귀문관살"] },
  { label: "고독·독립성", members: ["과숙살", "고신살"] },
];

/** 한글 음절의 받침 유무(유니코드 조합형 계산) — 살 이름은 늘 완성형 한글이라 이 계산으로 충분하다 */
function hasBatchim(text: string): boolean {
  const ch = text.charCodeAt(text.length - 1) - 0xac00;
  if (ch < 0 || ch > 11171) return false;
  return ch % 28 !== 0;
}

/**
 * 검출된 살 이름들에서 가장 두드러진 축 하나를 골라 한 줄 결론을 만든다.
 * 여러 축이 걸리면 매칭된 살이 가장 많은 축을 대표로 낸다(동률이면 THEME_GROUPS 순서).
 */
export function buildSalVerdict(names: string[]): string | null {
  if (names.length === 0) return null;
  const nameSet = new Set(names);
  let best: { label: string; matched: string[] } | null = null;
  for (const group of THEME_GROUPS) {
    const matched = group.members.filter((m) => nameSet.has(m));
    if (matched.length === 0) continue;
    if (!best || matched.length > best.matched.length) best = { label: group.label, matched };
  }
  if (!best) return null;
  const namesStr = best.matched.join("·");
  const labelJosa = hasBatchim(best.label) ? "을" : "를";
  const namesJosa = hasBatchim(namesStr) ? "이" : "가";
  return `${best.label}${labelJosa} 뜻하는 ${namesStr}${namesJosa} 두드러지는 사주입니다.`;
}

/** "역마살"→"역마", "귀문관살"→"귀문관". 귀인류는 이름 그대로("천을귀인"). */
export function shortSalName(name: string): string {
  return name.replace(/살$/, "");
}

/** where 문자열("월지", "월지+일지", "일주")에서 자리 인덱스(0~3)를 뽑는다 */
function positionsOf(where: string): number[] {
  const out: number[] = [];
  for (const m of where.matchAll(/(연|월|일|시)[지주]/g)) {
    const idx = POSITION_KEY.indexOf(m[1]);
    if (idx >= 0 && !out.includes(idx)) out.push(idx);
  }
  return out;
}

export function buildSalpuriCard(chart: SajuChart): SalpuriCardData {
  const p = chart.pillars;
  const cells = [p.year, p.month, p.day, p.hour];
  const pillars: SalpuriCardPillar[] = cells.map((c, i) => ({
    label: POSITION_LABEL[i],
    stem: c ? c.stem : null,
    branch: c ? c.branch : null,
    stemKr: c ? C.STEM_KR[c.stem] : null,
    branchKr: c ? C.BRANCH_KR[c.branch] : null,
  }));

  const marks: string[][] = [[], [], [], []];
  const salNames = new Set<string>();
  for (const s of chart.sal) {
    salNames.add(s.name);
    const short = shortSalName(s.name);
    for (const idx of positionsOf(s.where)) {
      if (!marks[idx].includes(short)) marks[idx].push(short);
    }
  }

  const overlaps: SalpuriCardOverlap[] = marks
    .map((names, idx) => ({ position: `${POSITION_LABEL[idx]}지`, names }))
    .filter((o) => o.names.length >= 2);

  return {
    count: salNames.size,
    pillars,
    marks,
    overlaps,
    verdict: buildSalVerdict([...salNames]),
  };
}
