/**
 * facts.ts — SajuChart → AI-friendly facts 변환. LLM 개입 없음.
 * Python saju_core/facts.py 1:1 포팅.
 */

import * as C from "./constants";
import type { Element } from "./constants";
import { type SajuChart, tenGod, branchTenGod, elementDistribution } from "./engine";

// ─── 1. 격국 ─────────────────────────────────────────────
export function deriveGyeokguk(chart: SajuChart) {
  const dg = chart.day_master;
  const monthBranch = chart.pillars.month.branch;
  const hidden = C.HIDDEN_STEMS[monthBranch];
  const mainHidden = hidden.reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const tg = tenGod(dg, mainHidden);
  const category = C.TEN_GOD_CATEGORY[tg];

  const nameMap: Record<string, string> = {
    "正財":"정재격","偏財":"편재격","正官":"정관격","偏官":"편관격(칠살격)",
    "正印":"정인격","偏印":"편인격","食神":"식신격","傷官":"상관격",
  };
  let gname: string;
  if (category === "비겁") gname = tg === "比肩" ? "건록격" : "양인격";
  else gname = nameMap[tg] ?? `${C.TEN_GOD_KR[tg]}격`;

  const desc: Record<string, string> = {
    "정재격": "꾸준한 누적으로 재물을 쌓는 안정형. 성실·관리·실속.",
    "편재격": "큰 기회·사업·투자형 재물. 활동적·통이 큼.",
    "정관격": "조직·명예·질서 안에서 인정받는 봉직형.",
    "편관격(칠살격)": "강한 추진력·결단·위기돌파형. 무관·전문직.",
    "정인격": "학문·자격·문서·보호의 안정형. 명예 중시.",
    "편인격": "독창·전문·기술·예술형. 비주류적 깊이.",
    "식신격": "표현·산출·먹복의 생산형. 낙천·전문기술.",
    "상관격": "재기·창의·표현의 재능형. 자유·비판·예술.",
    "건록격": "자수성가·독립형. 자기 힘으로 일군다.",
    "양인격": "강한 추진력·승부사형. 극단·결단의 양면.",
  };

  return {
    name: gname,
    ten_god: C.TEN_GOD_KR[tg],
    category,
    from_branch: `${monthBranch}(${C.BRANCH_KR[monthBranch]})`,
    description: desc[gname] ?? "",
  };
}

// ─── 2. 십성 카테고리 분포 ───────────────────────────────
export function tenGodCategorySummary(chart: SajuChart) {
  const de = chart.day_master_element;
  const elToCat: Record<Element, string> = {} as Record<Element, string>;
  elToCat[de] = "비겁";
  elToCat[C.GENERATES[de]] = "식상";
  elToCat[C.CONTROLS[de]] = "재성";
  for (const [k, v] of Object.entries(C.CONTROLS) as [Element, Element][])
    if (v === de) elToCat[k] = "관성";
  for (const [k, v] of Object.entries(C.GENERATES) as [Element, Element][])
    if (v === de) elToCat[k] = "인성";

  const catScore: Record<string, number> = {"비겁":0,"식상":0,"재성":0,"관성":0,"인성":0};
  for (const [el, amt] of Object.entries(chart.elements) as [Element, number][])
    catScore[elToCat[el]] += amt;

  const total = Object.values(catScore).reduce((a,b) => a+b, 0) || 1;
  const catPct: Record<string, number> = {};
  for (const k of Object.keys(catScore)) catPct[k] = Math.round(catScore[k] / total * 100);

  const strongest = Object.entries(catScore).reduce((a,b) => b[1]>a[1]?b:a)[0];
  const weakest = Object.entries(catScore).reduce((a,b) => b[1]<a[1]?b:a)[0];

  return { score: catScore, percent: catPct, strongest, weakest, meanings: C.CATEGORY_MEANING, element_to_category: elToCat };
}

// ─── 3. 오행 과다/부족 ───────────────────────────────────
export function elementBalance(chart: SajuChart) {
  const dist = chart.elements;
  const avg = Object.values(dist).reduce((a,b)=>a+b,0) / 5;
  const excess = (Object.entries(dist) as [Element, number][]).filter(([,v]) => v >= avg*1.6).map(([e]) => e);
  const lack = (Object.entries(dist) as [Element, number][]).filter(([,v]) => v <= avg*0.5).map(([e]) => e);
  const absent = (Object.entries(dist) as [Element, number][]).filter(([,v]) => v < 0.6).map(([e]) => e);
  const supplement: Record<string, { direct: Element; via: Element; kr: string }> = {};
  for (const e of lack) {
    const gen = Object.entries(C.GENERATES).find(([,v]) => v === e)?.[0] as Element ?? e;
    supplement[e] = { direct: e, via: gen, kr: C.ELEMENT_KR[e] };
  }
  return { distribution: dist, average: Math.round(avg*100)/100, excess, lack, absent, supplement };
}

// ─── 4. 핵심 구조 태그 ───────────────────────────────────
function rawTenGods(chart: SajuChart): string[] {
  const dg = chart.day_master;
  const out: string[] = [];
  for (const [key, val] of Object.entries(chart.pillars)) {
    if (!val) continue;
    if (key !== "day") out.push(tenGod(dg, val.stem));
    out.push(branchTenGod(dg, val.branch));
  }
  return out;
}

export function coreStructureTags(chart: SajuChart) {
  const tags: Array<{tag: string; label: string; why: string}> = [];
  const gyeok = deriveGyeokguk(chart);
  const cats = tenGodCategorySummary(chart);
  const bal = elementBalance(chart);
  const de = chart.day_master_element;

  tags.push({ tag: gyeok.name, label: gyeok.description, why: `월지 ${gyeok.from_branch}의 본기가 ${gyeok.ten_god}이라서.` });

  if (cats.score["식상"] <= 0.6)
    tags.push({ tag:"무식상(無食傷)", label:"순수 산출·수익화 통로가 원국에 약함.", why:`식상 비중 ${cats.score["식상"]}으로 매우 낮음.` });

  if (cats.score["재성"] >= 1.5 && cats.score["관성"] >= 1.5)
    tags.push({ tag:"재생관(財生官)", label:"재물·안목이 지위·평판으로 전환되는 흐름.", why:`재성(${cats.score["재성"]})과 관성(${cats.score["관성"]})이 함께 강함.` });

  if (cats.score["관성"] >= 1.5 && cats.score["인성"] >= 1.5)
    tags.push({ tag:"관인상생(官印相生)", label:"책임·직책이 자격·전문성으로 전환.", why:`관성(${cats.score["관성"]})과 인성(${cats.score["인성"]})이 함께 강함.` });

  const allTg = rawTenGods(chart);
  if (allTg.includes("正官") && allTg.includes("偏官"))
    tags.push({ tag:"관살혼잡(官殺混雜)", label:"정관·편관 혼재. 책임/이성 인연이 여러 갈래.", why:"원국에 정관과 편관 동시 존재." });

  for (const e of bal.excess) {
    const cat = cats.element_to_category[e];
    tags.push({ tag:`${C.ELEMENT_KR[e]}(${cat}) 과다`, label:`${C.CATEGORY_MEANING[cat]} — 이 기운이 과함.`, why:`${C.ELEMENT_KR[e]} 비중 ${bal.distribution[e]} (평균 ${bal.average}).` });
  }

  for (const s of chart.sal)
    if (["괴강살","양인살","백호살"].includes(s.name))
      tags.push({ tag: s.name, label: s.meaning, why: `${s.where}에 성립.` });

  return tags;
}

// ─── 5. 강점/약점 ────────────────────────────────────────
export function strengthsAndWeaknesses(chart: SajuChart) {
  const strengths: string[] = [], weaknesses: string[] = [];
  const cats = tenGodCategorySummary(chart);
  const salNames = new Set(chart.sal.map(s => s.name));

  const salMap: Record<string, [string, string|null]> = {
    "괴강살": ["결단력·추진력·카리스마·강한 자존감","흑백논리·극단성·완벽주의·자기 가혹함"],
    "양인살": ["강한 추진력·승부 근성","충동·과격함·날카로움"],
    "도화살": ["매력·인기·대중 친화력","이성 문제·구설 가능성"],
    "홍염살": ["매력·끼·표현력","이성 관계 복잡성"],
    "화개살": ["예술·학문·깊은 통찰","고독·내향·고립 경향"],
    "귀문관살": ["예민한 직관·통찰·예술 감각","집착·의심·신경과민"],
    "역마살": ["활동성·기동력·해외운","안정성 부족·분주함"],
    "천을귀인": ["귀인 복·위기 대처", null],
    "금여": ["복록·좋은 인연 자질", null],
    "문창귀인": ["총명·학습력·문서운", null],
  };
  for (const sn of salNames) {
    const entry = salMap[sn];
    if (entry) {
      if (entry[0]) strengths.push(entry[0]);
      if (entry[1]) weaknesses.push(entry[1]);
    }
  }

  const sc = cats.score;
  if (sc["재성"] >= 1.5) strengths.push("뛰어난 안목·물질 감각·현실 감각");
  if (sc["인성"] >= 1.5) strengths.push("학습력·전문성·자격 취득력");
  if (sc["관성"] >= 2.0) weaknesses.push("책임 과부하·관압(스트레스)에 취약");
  if (sc["식상"] <= 0.6) weaknesses.push("생각만 하다 행동이 늦어지는 보수성(산출 지연)");
  if (sc["비겁"] <= 0.6 && !chart.strength.is_strong) weaknesses.push("자기 세력 약함 → 휘둘리거나 지치기 쉬움");

  return { strengths: [...new Set(strengths)], weaknesses: [...new Set(weaknesses)] };
}

// ─── 6. 대운 흐름 요약 ───────────────────────────────────
export function daewoonNarrative(chart: SajuChart) {
  const favorableEl = new Set([...chart.yongsin.eokbu_candidates, ...chart.yongsin.johu_candidates]);
  const timeline = chart.daewoon.list.map(d => {
    const sEl = C.STEM_ELEMENT[d.stem];
    const bEl = C.BRANCH_ELEMENT[d.branch];
    let score = 0;
    if (favorableEl.has(sEl)) score++;
    if (favorableEl.has(bEl)) score++;
    const verdict = score === 2 ? "매우 우호" : score === 1 ? "우호" : "도전적";
    return { ...d, stem_element: sEl, branch_element: bEl, favorability: verdict, score };
  });
  return { favorable_elements: [...favorableEl], timeline, note: "용신(억부+조후) 오행이 들어오는 대운을 우호로 본 간이 평가." };
}

// ─── 7. 전체 facts 통합 ──────────────────────────────────
export function buildFacts(chart: SajuChart) {
  return {
    chart,
    gyeokguk: deriveGyeokguk(chart),
    ten_god_summary: tenGodCategorySummary(chart),
    element_balance: elementBalance(chart),
    core_structure: coreStructureTags(chart),
    strengths_weaknesses: strengthsAndWeaknesses(chart),
    daewoon_narrative: daewoonNarrative(chart),
  };
}
