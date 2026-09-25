/**
 * daewoon-curve.ts — 운명 설계도 최상단 카드 "대운 이중 곡선"의 데이터(CoS §D, 2026-09-23).
 *
 * 두 축: 사회적 확장력(E, 밖으로 뻗는 힘) / 정서·관계 안정도(S, 안으로 받치는 힘).
 * 원칙: 결정적(LLM 없음 — 같은 사주는 언제 열어도 같은 곡선) · 기존 엔진이 이미 가진
 * 값(십성·용신·기신·지지 관계·신살)만 쓴다 · 숫자는 화면에 노출하지 않는다(4단계 라벨).
 * 계산 엔진(lib/saju-engine)은 읽기만 한다. 용신 판정은 yongsin-track.ts 결과를 그대로 받는다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element, Stem, Branch } from "@/lib/saju-engine/constants";
import { tenGod, branchTenGod } from "@/lib/saju-engine/engine";
import type { BlueprintChart, PreciseDaewoonEntry } from "./engine";
import type { AnchorFacts } from "./anchor";

export type CurveLabel = "낮음" | "보통" | "양호" | "높음";

export interface CurvePoint {
  startAge: number;
  endAge: number;
  ganji: string;
  e: number; // 정규화 후 값(화면 좌표용 — 텍스트로 노출 금지)
  s: number;
  eLabel: CurveLabel;
  sLabel: CurveLabel;
  isCurrent: boolean;
}

export interface CurveAnnotation {
  index: number; // points 인덱스
  text: string;
}

export interface DaewoonCurve {
  points: CurvePoint[];
  annotations: CurveAnnotation[];
  /** 첫 교차 지점(points 인덱스 사이 보간 위치, 0~points.length-1). 없으면 null */
  crossAt: number | null;
  summary: string;
}

const BASE = 40;
const CLAMP_LO = 20;
const CLAMP_HI = 95;
const NORM_LO = 32;
const NORM_SPAN = 58; // 32 → 90
const MIN_RANGE = 12; // 평탄한 사주 과장 방지
const HIGH_MIN = 78;
const END_START_AGE = 94; // 94세 시작 대운까지 표시
const BRANCH_WEIGHT = 0.7;

// ① 십성 가중 [E, S]
const TEN_GOD_WEIGHT: Record<string, [number, number]> = {
  "傷官": [16, -4], "偏財": [16, 2], "食神": [14, 8], "正財": [12, 8], "偏官": [10, -2],
  "正官": [8, 10], "劫財": [8, 2], "比肩": [6, 10], "偏印": [4, 12], "正印": [2, 16],
};

export function curveLabelOf(v: number): CurveLabel {
  return v >= HIGH_MIN ? "높음" : v >= 62 ? "양호" : v >= 45 ? "보통" : "낮음";
}

/** precise_daewoon.list는 9구간(≈85세)까지라, 94세 시작 대운까지 같은 규칙으로 이어 붙인다. */
function extendList(chart: BlueprintChart): PreciseDaewoonEntry[] {
  const dw = chart.precise_daewoon;
  const out = [...dw.list];
  let last = out[out.length - 1];
  while (last && last.start_age + 10 <= END_START_AGE) {
    const step = dw.forward ? 1 : -1;
    const s = C.STEMS[(C.STEMS.indexOf(last.stem) + step + 10) % 10];
    const b = C.BRANCHES[(C.BRANCHES.indexOf(last.branch) + step + 12) % 12];
    last = {
      index: last.index + 1, start_age: last.start_age + 10, end_age: last.end_age + 10,
      start_year: last.start_year + 10, stem: s, branch: b, ganji: `${C.STEM_KR[s]}${C.BRANCH_KR[b]}`,
    };
    out.push(last);
  }
  return out.filter((d) => d.start_age <= END_START_AGE);
}

function yongsinBonus(el: Element, facts: AnchorFacts): number {
  if (facts.yongsin.includes(el)) return 8;
  if (facts.yongsinTrack.eokbu.includes(el) || facts.yongsinTrack.johu.includes(el)) return 4;
  if (facts.gisin.includes(el)) return -6;
  return 0;
}

/** 대운 지지가 명식 지지들과 맺는 관계의 [E, S] 가감. */
function branchRelationDelta(dwBranch: Branch, chartBranches: Branch[]): [number, number] {
  let e = 0, s = 0;
  for (const cb of chartBranches) {
    const key = C.branchPairKey(dwBranch, cb);
    if (C.BRANCH_SIX_COMBINE.has(key)) { e += 6; s += 8; }
    if (C.BRANCH_CLASH_PAIRS.has(key)) { e += 4; s -= 8; }
    if (C.BRANCH_HARM_PAIRS.has(key)) { e -= 2; s -= 4; }
    if (C.BRANCH_BREAK_PAIRS.has(key)) { e -= 2; s -= 4; }
    if (cb === dwBranch && C.BRANCH_SELF_PUNISH.has(dwBranch)) s -= 6;
  }
  for (const grp of C.BRANCH_PUNISH_GROUPS) {
    if (grp.includes(dwBranch) && chartBranches.some((cb) => cb !== dwBranch && grp.includes(cb))) s -= 6;
  }
  for (const { trio } of C.BRANCH_THREE_COMBINE) {
    if (trio.includes(dwBranch) && chartBranches.some((cb) => cb !== dwBranch && trio.includes(cb))) { e += 6; s += 8; }
  }
  return [e, s];
}

function rawScores(d: PreciseDaewoonEntry, chart: BlueprintChart, facts: AnchorFacts): [number, number] {
  const dayStem = chart.day_master as Stem;
  const branches = ([chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
    .filter((p): p is NonNullable<typeof p> => !!p)).map((p) => p.branch);
  let e = BASE, s = BASE;

  const [sg0, sg1] = TEN_GOD_WEIGHT[tenGod(dayStem, d.stem)] ?? [0, 0];
  const [bg0, bg1] = TEN_GOD_WEIGHT[branchTenGod(dayStem, d.branch)] ?? [0, 0];
  e += sg0 + bg0 * BRANCH_WEIGHT;
  s += sg1 + bg1 * BRANCH_WEIGHT;

  const yb = yongsinBonus(C.STEM_ELEMENT[d.stem], facts) + yongsinBonus(C.BRANCH_ELEMENT[d.branch], facts) * BRANCH_WEIGHT;
  e += yb; s += yb;

  const [re, rs] = branchRelationDelta(d.branch, branches);
  e += re; s += rs;

  // ④ 신살 — 대운 지지가 명식 기준(연지·일지)의 역마/도화/화개, 일간 기준 천을귀인이면
  const bases = new Set<Branch>([chart.pillars.year.branch, chart.pillars.day.branch]);
  for (const base of bases) {
    if (C.YEOKMA[base] === d.branch) e += 5;
    if (C.DOHWA[base] === d.branch) e += 4;
    if (C.HWAGAE[base] === d.branch) s += 4;
  }
  if (C.CHEONEUL_GWIIN[dayStem]?.includes(d.branch)) s += 6;

  const clamp = (v: number) => Math.min(CLAMP_HI, Math.max(CLAMP_LO, v));
  return [clamp(e), clamp(s)];
}

/**
 * 개인 내 min-max 정규화. 범위가 MIN_RANGE 미만이면 분모를 고정해 과장을 막되,
 * 그 경우 최고점을 "높음" 하한(78)에 고정해 "높음 구간이 최소 1개" 원칙을 지킨다.
 */
function normalize(raw: number[]): number[] {
  const min = Math.min(...raw), max = Math.max(...raw);
  const range = max - min;
  if (range >= MIN_RANGE) return raw.map((v) => NORM_LO + ((v - min) / range) * NORM_SPAN);
  return raw.map((v) => HIGH_MIN + ((v - max) / MIN_RANGE) * NORM_SPAN);
}

export function buildDaewoonCurve(chart: BlueprintChart, facts: AnchorFacts): DaewoonCurve | null {
  const list = extendList(chart);
  if (list.length < 3) return null;
  const raws = list.map((d) => rawScores(d, chart, facts));
  const eN = normalize(raws.map((r) => r[0]));
  const sN = normalize(raws.map((r) => r[1]));
  const currentGanji = facts.daewoonNow?.ganji ?? null;

  const points: CurvePoint[] = list.map((d, i) => ({
    startAge: d.start_age, endAge: d.end_age, ganji: d.ganji,
    e: eN[i], s: sN[i], eLabel: curveLabelOf(eN[i]), sLabel: curveLabelOf(sN[i]),
    isCurrent: currentGanji !== null && d.ganji === currentGanji,
  }));
  const curIdx = Math.max(0, points.findIndex((p) => p.isCurrent));
  const last = points.length - 1;

  // 교차: (E-S) 부호가 바뀌는 구간. 0은 직전 부호를 잇는다.
  let prevSign = 0;
  const crossings: { idx: number; at: number; rising: boolean; leader: "e" | "s" }[] = [];
  for (let i = 0; i < points.length; i++) {
    const diff = points[i].e - points[i].s;
    const sign = diff > 0 ? 1 : diff < 0 ? -1 : prevSign;
    if (i > 0 && prevSign !== 0 && sign !== 0 && sign !== prevSign) {
      const d0 = points[i - 1].e - points[i - 1].s;
      const at = i - 1 + (d0 === 0 ? 0 : d0 / (d0 - diff));
      const leader = sign > 0 ? "e" : "s";
      const rising = points[i][leader] >= points[i - 1][leader];
      crossings.push({ idx: i, at, rising, leader });
    }
    if (sign !== 0) prevSign = sign;
  }
  const crossAt = crossings.length > 0 ? crossings[0].at : null;

  const ageRange = (i: number) => `${points[i].startAge}~${points[i].endAge}세`;
  const peakIdx = points.reduce((best, p, i) => (p.e > points[best].e ? i : best), 0);

  // 주석 후보 — 하강 구간·마지막 대운에는 달지 않는다.
  const peak: CurveAnnotation | null = peakIdx < last ? { index: peakIdx, text: `${ageRange(peakIdx)} 확장 정점` } : null;

  const ranked = crossings.filter((c) => c.rising && c.idx < last);
  const cross = ranked.find((c) => c.idx >= curIdx) ?? ranked[0];
  const crossAnn: CurveAnnotation | null = cross
    ? { index: cross.idx, text: `${points[cross.idx].startAge}세~ ${cross.leader === "s" ? "안정도가 확장력을 앞서는" : "확장력이 안정도를 앞서는"} 국면` }
    : null;

  let rebound: CurveAnnotation | null = null;
  const cp = points[curIdx];
  const lowAxis: "e" | "s" | null = cp.eLabel === "낮음" ? "e" : cp.sLabel === "낮음" ? "s" : null;
  if (lowAxis) {
    const up = points.findIndex((p, i) => i > curIdx && p[lowAxis] >= 45);
    if (up > curIdx) rebound = { index: up, text: `${points[up].startAge}세부터 다시 올라섭니다` };
  }

  // 최대 2개, 우선순위 ①확장 정점 ②교차 ③반등. 현재가 낮음이면 ③ 반드시 포함.
  const annotations: CurveAnnotation[] = [];
  if (rebound) {
    annotations.push(rebound);
    const other = peak ?? crossAnn;
    if (other) annotations.push(other);
  } else {
    for (const a of [peak, crossAnn]) if (a) annotations.push(a);
  }
  annotations.sort((a, b) => a.index - b.index);

  const peakText = ageRange(peakIdx);
  const summary = crossAt !== null
    ? `${peakText} 확장 정점 · ${points[Math.ceil(crossAt)].startAge}세 이후 두 곡선이 교차한다`
    : `${peakText} 확장 정점 · 두 힘이 나란히 가는 설계`;

  return { points, annotations, crossAt, summary };
}
