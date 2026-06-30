/**
 * engine.ts — 결정론적 사주 계산 엔진. LLM 개입 없음.
 * Python saju_core/engine.py를 1:1 포팅.
 *
 * 정확도 주의(프로덕션 교체 포인트):
 * - 절기: 근사 테이블 사용. 정밀 버전은 천문 계산 라이브러리 필요.
 * - 진태양시: 경도 보정 미구현(한국 표준시 135°E 기준 약 -30분 오차).
 * - 야자시: 23~24시를 당일 子시로 처리.
 */

import * as C from "./constants";
import type { Stem, Branch, Element } from "./constants";

// ─── 타입 정의 ───────────────────────────────────────────
export type Pillar = { stem: Stem; branch: Branch };
export type Pillars = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };

export interface StrengthResult {
  score_support: number;
  score_drain: number;
  ratio_support: number;
  is_strong: boolean;
  verdict: string;
  deuk_ryeong: boolean;
  deuk_ji: boolean;
  detail: string;
}

export interface YongsinResult {
  eokbu_candidates: Element[];
  johu_candidates: Element[];
  climate: string;
  note: string;
}

export interface DaewoonEntry {
  index: number;
  start_age: number;
  end_age: number;
  start_year: number;
  stem: Stem;
  branch: Branch;
  ganji: string;
}

export interface DaewoonResult {
  direction: string;
  forward: boolean;
  start_age: number;
  list: DaewoonEntry[];
}

export interface SalEntry {
  name: string;
  where: string;
  meaning: string;
}

export interface Interactions {
  stem_combine: Array<{pos: string; pair: string; into: Element}>;
  stem_clash: Array<{pos: string; pair: string}>;
  branch_six_combine: Array<{pos: string; pair: string; into: Element}>;
  branch_three_combine: Array<{branches: string; into: Element; type: string}>;
  branch_clash: Array<{pos: string; pair: string}>;
  branch_harm: Array<{pos: string; pair: string}>;
  branch_break: Array<{pos: string; pair: string}>;
  branch_punish: Array<{branches?: string; pos?: string; pair?: string; type: string}>;
}

export interface SajuChart {
  birth_iso: string;
  gender: string;
  has_hour: boolean;
  pillars: Pillars;
  day_master: Stem;
  day_master_element: Element;
  ten_gods: Record<string, string>;
  elements: Record<Element, number>;
  strength: StrengthResult;
  yongsin: YongsinResult;
  daewoon: DaewoonResult;
  sal: SalEntry[];
  interactions: Interactions;
  twelve_stages: Record<string, string>;
}

// ─── 0. 헬퍼 ─────────────────────────────────────────────
function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function stemBranchKr(stem: Stem, branch: Branch): string {
  return `${stem}${branch}(${C.STEM_KR[stem]}${C.BRANCH_KR[branch]})`;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ─── 1. 사주 계산 ─────────────────────────────────────────
export function calcYearPillar(y: number, m: number, d: number): Pillar {
  let yy = y;
  if (m < 2 || (m === 2 && d < 4)) yy = y - 1;
  return {
    stem: C.STEMS[mod(yy - 4, 10)],
    branch: C.BRANCHES[mod(yy - 4, 12)],
  };
}

export function calcMonthBranch(y: number, m: number, d: number): Branch {
  let cur: Branch = "丑";
  for (const [mm, dd, br] of C.SOLAR_TERM_APPROX) {
    if (mm === 1) {
      if (m === 1 && d >= dd) cur = "丑";
    } else {
      if (m > mm || (m === mm && d >= dd)) cur = br;
    }
  }
  if (m < 2 || (m === 2 && d < 4)) cur = "丑";
  return cur;
}

export function calcMonthStem(yearStem: Stem, monthBranch: Branch): Stem {
  const head = C.MONTH_STEM_HEAD[yearStem];
  const hi = C.STEMS.indexOf(head);
  const bi = C.MONTH_BRANCH_ORDER.indexOf(monthBranch);
  return C.STEMS[mod(hi + bi, 10)];
}

export function calcDayPillar(y: number, m: number, d: number): Pillar {
  const jdn = julianDayNumber(y, m, d);
  const idx = mod(jdn - 2451551, 60);
  return { stem: C.STEMS[idx % 10], branch: C.BRANCHES[idx % 12] };
}

export function calcHourPillar(dayStem: Stem, hour: number): Pillar {
  let branch: Branch = "子";
  for (const [lo, hi, br] of C.HOUR_TO_BRANCH) {
    if (hour >= lo && hour < hi) { branch = br; break; }
  }
  const head = C.HOUR_STEM_HEAD[dayStem];
  const hiIdx = C.STEMS.indexOf(head);
  const bi = C.BRANCHES.indexOf(branch);
  return { stem: C.STEMS[mod(hiIdx + bi, 10)], branch };
}

// ─── 2. 십성 ─────────────────────────────────────────────
export function tenGod(dayStem: Stem, otherStem: Stem): string {
  const de = C.STEM_ELEMENT[dayStem];
  const oe = C.STEM_ELEMENT[otherStem];
  const sameYY = C.STEM_YINYANG[dayStem] === C.STEM_YINYANG[otherStem];
  if (oe === de) return sameYY ? "比肩" : "劫財";
  if (C.GENERATES[de] === oe) return sameYY ? "食神" : "傷官";
  if (C.CONTROLS[de] === oe) return sameYY ? "偏財" : "正財";
  if (C.CONTROLS[oe] === de) return sameYY ? "偏官" : "正官";
  if (C.GENERATES[oe] === de) return sameYY ? "偏印" : "正印";
  return "?";
}

export function branchTenGod(dayStem: Stem, branch: Branch): string {
  const hidden = C.HIDDEN_STEMS[branch];
  const mainHidden = hidden.reduce((a, b) => b[1] > a[1] ? b : a)[0];
  return tenGod(dayStem, mainHidden);
}

// ─── 3. 오행 분포 ─────────────────────────────────────────
export function elementDistribution(pillars: Pillar[]): Record<Element, number> {
  const dist: Record<Element, number> = {"木":0,"火":0,"土":0,"金":0,"水":0};
  for (const {stem, branch} of pillars) {
    dist[C.STEM_ELEMENT[stem]] += 1.0;
    dist[C.BRANCH_ELEMENT[branch]] += 1.0;
    for (const [hs, w] of C.HIDDEN_STEMS[branch]) {
      if (C.STEM_ELEMENT[hs] !== C.BRANCH_ELEMENT[branch]) {
        dist[C.STEM_ELEMENT[hs]] += w * 0.8;
      }
    }
  }
  const result = {} as Record<Element, number>;
  for (const k of C.ELEMENTS) result[k] = Math.round(dist[k] * 100) / 100;
  return result;
}

// ─── 4. 십이운성 ─────────────────────────────────────────
export function twelveStage(stem: Stem, branch: Branch): string {
  const start = C.CHANGSAENG_START[stem];
  if (!start) return "?";
  const startIdx = C.BRANCHES.indexOf(start);
  const curIdx = C.BRANCHES.indexOf(branch);
  const forward = C.STEM_YINYANG[stem] === "+";
  const step = forward ? mod(curIdx - startIdx, 12) : mod(startIdx - curIdx, 12);
  return C.TWELVE_STAGES[step];
}

// ─── 5. 신강/신약 ─────────────────────────────────────────
function elementThatGenerates(el: Element): Element {
  for (const [k, v] of Object.entries(C.GENERATES) as [Element, Element][]) {
    if (v === el) return k;
  }
  return el;
}

export function strengthAssessment(dayStem: Stem, pillars: Pillar[], monthBranch: Branch): StrengthResult {
  const de = C.STEM_ELEMENT[dayStem];
  const supportEl = new Set<Element>([de, elementThatGenerates(de)]);
  const dist = elementDistribution(pillars);
  let support = 0, drain = 0;
  for (const [el, amt] of Object.entries(dist) as [Element, number][]) {
    if (supportEl.has(el)) support += amt; else drain += amt;
  }
  const monthEl = C.BRANCH_ELEMENT[monthBranch];
  const deukRyeong = supportEl.has(monthEl);
  if (deukRyeong) support += 1.5; else drain += 1.0;
  const dayBranch = pillars[2]?.branch ?? pillars[pillars.length-1].branch;
  const deukJi = supportEl.has(C.BRANCH_ELEMENT[dayBranch]);
  const isStrong = support >= drain;
  const ratio = (support + drain) > 0 ? support / (support + drain) : 0.5;
  let verdict: string;
  if (ratio >= 0.58) verdict = "신강(身强)";
  else if (ratio >= 0.48) verdict = isStrong ? "중화에 가까운 신강" : "중화에 가까운 신약";
  else if (ratio >= 0.38) verdict = "신약(身弱)";
  else verdict = "극신약(極身弱)";
  return {
    score_support: Math.round(support * 100) / 100,
    score_drain: Math.round(drain * 100) / 100,
    ratio_support: Math.round(ratio * 1000) / 1000,
    is_strong: isStrong,
    verdict,
    deuk_ryeong: deukRyeong,
    deuk_ji: deukJi,
    detail: `일간 ${dayStem}(${C.STEM_KR[dayStem]})·${de} 기준 돕는 세력 ${Math.round(support*10)/10} vs 빼앗는 세력 ${Math.round(drain*10)/10}. 월령 ${deukRyeong?"득(得)":"실(失)"}令, 일지 ${deukJi?"득(得)":"실(失)"}地.`,
  };
}

// ─── 6. 용신 ─────────────────────────────────────────────
export function calcYongsin(dayStem: Stem, pillars: Pillar[], monthBranch: Branch, strength: StrengthResult): YongsinResult {
  const de = C.STEM_ELEMENT[dayStem];
  const dist = elementDistribution(pillars);
  let eokbu: Element[];
  if (strength.is_strong) {
    eokbu = [C.GENERATES[de], C.CONTROLS[de]];
  } else {
    eokbu = [elementThatGenerates(de), de];
  }
  const hotMonths = new Set<Branch>(["巳","午","未"]);
  const coldMonths = new Set<Branch>(["亥","子","丑"]);
  const fire = dist["火"], water = dist["水"];
  let johu: Element[], climate: string;
  if (hotMonths.has(monthBranch) || fire - water >= 2.0) {
    johu = ["水","金"]; climate = "덥고 건조(燥熱)";
  } else if (coldMonths.has(monthBranch) || water - fire >= 2.0) {
    johu = ["火","木"]; climate = "춥고 습함(寒濕)";
  } else {
    johu = []; climate = "한난 중화";
  }
  return {
    eokbu_candidates: eokbu,
    johu_candidates: johu,
    climate,
    note: "억부(힘의 균형)와 조후(기후)는 목적이 다르므로 공존할 수 있다. 최종 용신은 격국까지 종합해 판단해야 한다.",
  };
}

// ─── 7. 대운 ─────────────────────────────────────────────
function approxDaewoonStart(birthDay: number, forward: boolean): number {
  const daysTo = forward ? mod(6 + 30 - birthDay, 30) : Math.abs(birthDay - 6) % 30;
  return Math.min(Math.max(1, Math.round(daysTo / 3)), 10);
}

export function calcDaewoon(yearStem: Stem, monthPillar: Pillar, gender: string, birthYear: number, birthDay: number, count = 9): DaewoonResult {
  const yearYang = C.STEM_YINYANG[yearStem] === "+";
  const isMale = gender.toUpperCase() === "M";
  const forward = (yearYang && isMale) || (!yearYang && !isMale);
  const direction = forward ? "순행(順行)" : "역행(逆行)";
  const startAge = approxDaewoonStart(birthDay, forward);
  const mStemIdx = C.STEMS.indexOf(monthPillar.stem);
  const mBranchIdx = C.BRANCHES.indexOf(monthPillar.branch);
  const list: DaewoonEntry[] = [];
  for (let i = 1; i <= count; i++) {
    const s = forward ? C.STEMS[mod(mStemIdx + i, 10)] : C.STEMS[mod(mStemIdx - i, 10)];
    const b = forward ? C.BRANCHES[mod(mBranchIdx + i, 12)] : C.BRANCHES[mod(mBranchIdx - i, 12)];
    const age = startAge + (i - 1) * 10;
    list.push({ index: i, start_age: age, end_age: age + 9, start_year: birthYear + age, stem: s, branch: b, ganji: stemBranchKr(s, b) });
  }
  return { direction, forward, start_age: startAge, list };
}

// ─── 8. 신살 ─────────────────────────────────────────────
export function detectSal(pillars: Pillar[]): SalEntry[] {
  const found: SalEntry[] = [];
  const stems = pillars.map(p => p.stem);
  const branches = pillars.map(p => p.branch);
  const posKr = ["연지","월지","일지","시지"];
  const yearBranch = branches[0];
  const dayStem = stems[2] ?? stems[stems.length-1];
  const dayBranch = branches[2] ?? branches[branches.length-1];
  const dayGanji = (stems[2] ?? "") + (branches[2] ?? "");

  const add = (name: string, where: string) =>
    found.push({ name, where, meaning: C.SAL_MEANING[name] ?? "" });

  // 천을귀인
  for (let i = 0; i < branches.length; i++)
    if (C.CHEONEUL_GWIIN[dayStem]?.includes(branches[i])) add("천을귀인", posKr[i]);
  // 도화/역마/화개
  for (const base of new Set([yearBranch, dayBranch])) {
    for (let i = 0; i < branches.length; i++) {
      if (C.DOHWA[base] === branches[i]) add("도화살", posKr[i]);
      if (C.YEOKMA[base] === branches[i]) add("역마살", posKr[i]);
      if (C.HWAGAE[base] === branches[i]) add("화개살", posKr[i]);
    }
  }
  // 홍염/금여/문창/양인
  for (let i = 0; i < branches.length; i++) {
    if (C.HONGYEOM[dayStem] === branches[i]) add("홍염살", posKr[i]);
    if (C.GEUMYEO[dayStem] === branches[i]) add("금여", posKr[i]);
    if (C.MUNCHANG[dayStem] === branches[i]) add("문창귀인", posKr[i]);
    if (C.YANGIN[dayStem] === branches[i]) add("양인살", posKr[i]);
  }
  // 과숙/고신
  for (let i = 0; i < branches.length; i++) {
    if (C.GWASUK[yearBranch] === branches[i]) add("과숙살", posKr[i]);
    if (C.GOSIN[yearBranch] === branches[i]) add("고신살", posKr[i]);
  }
  // 귀문관살
  for (let i = 0; i < branches.length; i++)
    for (let j = i+1; j < branches.length; j++)
      if (C.GWIMUN_PAIRS.has([branches[i],branches[j]].sort().join("")))
        add("귀문관살", `${posKr[i]}+${posKr[j]}`);
  // 괴강/백호
  if (dayGanji && C.GOEGANG_DAYS.has(dayGanji)) add("괴강살", "일주");
  for (let i = 0; i < pillars.length; i++)
    if (C.BAEKHO.has(pillars[i].stem + pillars[i].branch)) add("백호살", posKr[i]);

  // 중복 제거
  const seen = new Set<string>();
  return found.filter(f => {
    const key = `${f.name}|${f.where}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

// ─── 9. 합충형해파 탐지 ───────────────────────────────────
export function detectInteractions(pillars: Pillar[]): Interactions {
  const stems = pillars.map(p => p.stem);
  const branches = pillars.map(p => p.branch);
  const pos = ["연","월","일","시"];
  const out: Interactions = {
    stem_combine:[], stem_clash:[], branch_six_combine:[], branch_three_combine:[],
    branch_clash:[], branch_harm:[], branch_break:[], branch_punish:[],
  };
  // 천간
  for (let i = 0; i < stems.length; i++) for (let j = i+1; j < stems.length; j++) {
    const key = [stems[i],stems[j]].sort().join("");
    const pairStr = `${pos[i]}-${pos[j]}`;
    if (C.STEM_COMBINE.has(key)) out.stem_combine.push({pos:pairStr, pair:`${stems[i]}${stems[j]}`, into:C.STEM_COMBINE.get(key)!});
    if (C.STEM_CLASH_PAIRS.has(key) || C.STEM_CLASH_PAIRS.has(key.split("").reverse().join(""))) out.stem_clash.push({pos:pairStr, pair:`${stems[i]}${stems[j]}`});
  }
  // 지지 2자
  for (let i = 0; i < branches.length; i++) for (let j = i+1; j < branches.length; j++) {
    const key = [branches[i],branches[j]].sort().join("");
    const tag = `${pos[i]}-${pos[j]}`;
    const bb = `${branches[i]}${branches[j]}`;
    if (C.BRANCH_SIX_COMBINE.has(key)) out.branch_six_combine.push({pos:tag, pair:bb, into:C.BRANCH_SIX_COMBINE.get(key)!});
    if (C.BRANCH_CLASH_PAIRS.has(key)) out.branch_clash.push({pos:tag, pair:bb});
    if (C.BRANCH_HARM_PAIRS.has(key)) out.branch_harm.push({pos:tag, pair:bb});
    if (C.BRANCH_BREAK_PAIRS.has(key)) out.branch_break.push({pos:tag, pair:bb});
    if (branches[i] === branches[j] && C.BRANCH_SELF_PUNISH.has(branches[i])) out.branch_punish.push({pos:tag, pair:bb, type:"자형"});
  }
  // 삼합
  const bset = new Set(branches);
  for (const {trio, element} of C.BRANCH_THREE_COMBINE) {
    const inter = trio.filter(b => bset.has(b));
    if (inter.length === 3) out.branch_three_combine.push({branches:inter.join(""), into:element, type:"삼합"});
    else if (inter.length === 2 && inter.includes(C.THREE_COMBINE_CENTER[element])) out.branch_three_combine.push({branches:inter.join(""), into:element, type:"반합"});
  }
  // 삼형
  for (const grp of C.BRANCH_PUNISH_GROUPS) {
    const inter = grp.filter(b => bset.has(b));
    if (inter.length >= 2) out.branch_punish.push({branches:inter.join(""), type:"형"});
  }
  return out;
}

// ─── 10. 통합 차트 빌드 ──────────────────────────────────
export function buildChart(birthIso: string, gender: string, hasHour = true): SajuChart {
  const dt = new Date(birthIso);
  const y = dt.getFullYear(), m = dt.getMonth()+1, d = dt.getDate();
  const h = dt.getHours();

  const yPillar = calcYearPillar(y, m, d);
  const mBranch = calcMonthBranch(y, m, d);
  const mStem = calcMonthStem(yPillar.stem, mBranch);
  const mPillar: Pillar = { stem: mStem, branch: mBranch };
  const dPillar = calcDayPillar(y, m, d);

  const pillarsList: Pillar[] = [yPillar, mPillar, dPillar];
  const pillars: Pillars = { year: yPillar, month: mPillar, day: dPillar, hour: null };
  if (hasHour) {
    const hPillar = calcHourPillar(dPillar.stem, h);
    pillars.hour = hPillar;
    pillarsList.push(hPillar);
  }

  const posNames = ["year","month","day","hour"];
  const tg: Record<string, string> = {};
  for (let i = 0; i < pillarsList.length; i++) {
    const {stem, branch} = pillarsList[i];
    tg[`${posNames[i]}_stem`] = posNames[i] === "day" ? "일간(본원)" : C.TEN_GOD_KR[tenGod(dPillar.stem, stem)];
    tg[`${posNames[i]}_branch`] = C.TEN_GOD_KR[branchTenGod(dPillar.stem, branch)];
  }

  const stages: Record<string, string> = {};
  for (let i = 0; i < pillarsList.length; i++)
    stages[posNames[i]] = C.TWELVE_STAGES_KR[twelveStage(dPillar.stem, pillarsList[i].branch)];

  const strength = strengthAssessment(dPillar.stem, pillarsList, mBranch);
  const ys = calcYongsin(dPillar.stem, pillarsList, mBranch, strength);
  const dw = calcDaewoon(yPillar.stem, mPillar, gender, y, d);
  const sal = detectSal(pillarsList);
  const inter = detectInteractions(pillarsList);
  const elems = elementDistribution(pillarsList);

  return {
    birth_iso: birthIso,
    gender,
    has_hour: hasHour,
    pillars,
    day_master: dPillar.stem,
    day_master_element: C.STEM_ELEMENT[dPillar.stem],
    ten_gods: tg,
    elements: elems,
    strength,
    yongsin: ys,
    daewoon: dw,
    sal,
    interactions: inter,
    twelve_stages: stages,
  };
}
