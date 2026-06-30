/**
 * compatibility.ts — 궁합 엔진. Python saju_core/compatibility.py 1:1 포팅.
 */

import * as C from "./constants";
import type { Element } from "./constants";
import type { SajuChart } from "./engine";

function favorableElements(chart: SajuChart): Set<Element> {
  return new Set([...chart.yongsin.eokbu_candidates, ...chart.yongsin.johu_candidates]);
}

function avoidElements(chart: SajuChart): Set<Element> {
  const avg = Object.values(chart.elements).reduce((a,b)=>a+b,0) / 5;
  return new Set((Object.entries(chart.elements) as [Element, number][]).filter(([,v]) => v >= avg*1.6).map(([e]) => e));
}

type CompatContext = "romance" | "work" | "friend";

export function pairAnalysis(a: SajuChart, b: SajuChart, aName = "A", bName = "B", context: CompatContext = "friend") {
  const notes: string[] = [];
  let score = 0;
  const details: Record<string, unknown> = {};

  const W = {
    romance: { stem:1.0, branch:1.6, complement:1.2, yongsin:2.0 },
    work:    { stem:1.4, branch:0.8, complement:1.6, yongsin:1.0 },
    friend:  { stem:1.2, branch:1.0, complement:1.2, yongsin:1.2 },
  }[context];

  const ag = a.day_master, bg = b.day_master;
  const az = a.pillars.day.branch, bz = b.pillars.day.branch;

  // 1. 천간
  const stemKey = [ag, bg].sort().join("");
  if (C.STEM_COMBINE.has(stemKey)) {
    score += 2.5 * W.stem;
    notes.push(`천간합(${C.STEM_KR[ag]}${C.STEM_KR[bg]}합) — 자연스러운 끌림·협력`);
    details.stem = "합";
  } else if (C.STEM_CLASH_PAIRS.has(stemKey)) {
    if (context === "work") { score += 0.5*W.stem; notes.push(`천간충 — 의견 충돌이나 작업 시너지 가능`); details.stem = "충(업무)"; }
    else { score -= 1.0*W.stem; notes.push(`천간충(${C.STEM_KR[ag]}${C.STEM_KR[bg]}충) — 부딪힘·긴장`); details.stem = "충"; }
  } else if (ag === bg) {
    score += 1.0*W.stem;
    notes.push(`같은 일간(${C.STEM_KR[ag]}) — 동질감(주도권 경쟁 주의)`);
    details.stem = "비견";
  } else {
    const ae = C.STEM_ELEMENT[ag], be = C.STEM_ELEMENT[bg];
    if (C.GENERATES[ae] === be) { score += 0.8*W.stem; notes.push(`${aName}이 ${bName}을 생함 — ${aName}이 챙겨주는 구조`); details.stem = "내가 생"; }
    else if (C.GENERATES[be] === ae) { score += 1.2*W.stem; notes.push(`${bName}이 ${aName}을 생함 — ${bName}이 챙겨주는 구조`); details.stem = "상대가 생"; }
    else if (C.CONTROLS[ae] === be) { score += 0.2*W.stem; notes.push(`${aName}이 ${bName}을 극함 — ${aName}이 주도권`); details.stem = "내가 극"; }
    else if (C.CONTROLS[be] === ae) { score -= 0.3*W.stem; notes.push(`${bName}이 ${aName}을 극함 — 압박감 느낄 수 있음`); details.stem = "상대가 극"; }
  }

  // 2. 일지
  const branchKey = [az, bz].sort().join("");
  if (C.BRANCH_SIX_COMBINE.has(branchKey)) {
    score += 2.5*W.branch; notes.push(`일지 육합(${C.BRANCH_KR[az]}${C.BRANCH_KR[bz]}합) — 정서·생활 코드가 잘 맞음`); details.branch = "육합";
  } else if (C.BRANCH_CLASH_PAIRS.has(branchKey)) {
    score -= 1.5*W.branch; notes.push(`일지 충 — 가치관·생활 충돌 주의`); details.branch = "충";
  } else if (C.BRANCH_HARM_PAIRS.has(branchKey)) {
    score -= 1.0*W.branch; notes.push(`일지 해 — 은근히 소모되는 관계`); details.branch = "해";
  }
  for (const {trio, element} of C.BRANCH_THREE_COMBINE) {
    if (new Set([az,bz]).size === 2 && trio.includes(az) && trio.includes(bz) && trio.includes(C.THREE_COMBINE_CENTER[element])) {
      score += 2.0*W.branch; notes.push(`일지 반합(${C.BRANCH_KR[az]}${C.BRANCH_KR[bz]}/${C.ELEMENT_KR[element]}국) — 강한 정서 연결`); details.branch = `반합(${C.ELEMENT_KR[element]})`;
    }
  }

  // 3. 오행 보완
  const aAvg = Object.values(a.elements).reduce((x,y)=>x+y,0) / 5;
  const aLack = new Set((Object.entries(a.elements) as [Element, number][]).filter(([,v]) => v <= aAvg*0.5).map(([e]) => e));
  const bSupply = new Set((Object.entries(b.elements) as [Element, number][]).filter(([,v]) => v >= aAvg*1.0).map(([e]) => e));
  const fills = [...aLack].filter(e => bSupply.has(e));
  if (fills.length) {
    score += fills.length * 1.0 * W.complement;
    notes.push(`${aName}의 부족 오행(${[...aLack].map(e=>C.ELEMENT_KR[e]).join(",")})을 ${bName}이 채워줌(${fills.map(e=>C.ELEMENT_KR[e]).join(",")})`);
  }
  details.complement_fills = fills;

  // 4. 용신 공급
  const aYong = favorableElements(a);
  const aAvoid = avoidElements(a);
  const bMainElems = new Set([C.STEM_ELEMENT[bg], C.BRANCH_ELEMENT[bz]]);
  const yongHit = [...aYong].filter(e => bMainElems.has(e));
  const avoidHit = [...aAvoid].filter(e => bMainElems.has(e));
  if (yongHit.length) {
    score += yongHit.length * 1.5 * W.yongsin;
    notes.push(`${bName}이 ${aName}의 용신 오행(${yongHit.map(e=>C.ELEMENT_KR[e]).join(",")})을 공급 — 운을 살려주는 상대`);
  }
  if (avoidHit.length) {
    score -= avoidHit.length * 1.0 * W.yongsin;
    notes.push(`${bName}이 ${aName}의 과다 오행(${avoidHit.map(e=>C.ELEMENT_KR[e]).join(",")})을 더함 — 부담 가중 가능`);
  }
  details.yongsin_hit = yongHit;
  details.avoid_hit = avoidHit;

  return { from: aName, to: bName, context, score: Math.round(score*100)/100, notes, details };
}
