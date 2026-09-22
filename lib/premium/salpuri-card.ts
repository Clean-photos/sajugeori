/**
 * salpuri-card.ts — 프리미엄 살풀이 결과 최상단 요약 카드(명식 배치도형)의 데이터.
 *
 * CoS §C-2 ②: "어느 자리에 앉았는지 · 겹치는지"가 경쟁 무료 판정기가 못 하는 차별점이다.
 * chart에서 이미 계산된 값(pillars·sal·yongsin 후보)만 읽어 카드용으로 정리하는 순수 함수 —
 * 계산 엔진은 건드리지 않는다. 생년월일·시각 원본은 담지 않는다(카드는 단톡방에 그대로 공유된다).
 *
 * 저장본은 재계산해서 쓰는 상품이라(살풀이 [id] 페이지) 이 데이터도 열람 시마다 chart로 다시 만든다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import { buildYongsinDualTrack } from "@/lib/premium/yongsin-track";

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

export interface SalpuriCardElement {
  el: string; // 예: "金"
  kr: string; // 예: "금"
}

export interface SalpuriCardData {
  /** 검출된 살 종류 수 — 기존 칩 문구("검출된 살 N종")와 같은 기준(이름 기준 중복 제거) */
  count: number;
  pillars: SalpuriCardPillar[]; // 연·월·일·시 순 4개
  /** pillars와 같은 순서 — 각 자리에 앉은 살 이름(표시용 짧은 이름) */
  marks: string[][];
  /** 한 자리에 살이 둘 이상 겹친 곳 */
  overlaps: SalpuriCardOverlap[];
  /** 억부·조후 두 트랙을 단정 없이 병기 (yongsin-track.ts 표준) */
  yongsin: { eokbu: SalpuriCardElement[]; johu: SalpuriCardElement[]; hourUnknown: boolean };
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

const toEl = (el: string): SalpuriCardElement => ({ el, kr: C.ELEMENT_KR[el as keyof typeof C.ELEMENT_KR] ?? "" });

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
  for (const s of chart.sal) {
    const short = shortSalName(s.name);
    for (const idx of positionsOf(s.where)) {
      if (!marks[idx].includes(short)) marks[idx].push(short);
    }
  }

  const overlaps: SalpuriCardOverlap[] = marks
    .map((names, idx) => ({ position: `${POSITION_LABEL[idx]}지`, names }))
    .filter((o) => o.names.length >= 2);

  const track = buildYongsinDualTrack(chart);

  return {
    count: new Set(chart.sal.map((s) => s.name)).size,
    pillars,
    marks,
    overlaps,
    yongsin: {
      eokbu: track.eokbu.map(toEl),
      johu: track.johu.map(toEl),
      hourUnknown: !p.hour,
    },
  };
}
