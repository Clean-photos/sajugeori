/**
 * anchor.ts — 앵커 1회 확정.
 *
 * 스펙 8장: "앵커 선행 확정 1회 → 전 호출에 공통 주입. 없으면 축 간 모순이
 * 반드시 발생". 앵커의 구성 요소 중 신강/신약·용신·6대 지표는 이미 코드로
 * 계산 가능하므로(근거 강도 A), 여기서는 그 값들을 하나의 "사실 시트"로
 * 정리하고 — 이것을 이후 모든 LLM 호출(총론·축1~4·실행설계)에 그대로
 * 주입해 축 간 모순을 원천 차단한다 — 오직 "구조적 제약 2개 / 지렛대 2개"
 * 만 LLM에게 맡긴다. 이 둘은 여러 사실을 종합하는 해석적 판단이라 순수
 * 산식으로 대체하기 어렵지만, 프롬프트에 사실 시트를 그대로 첨부해 근거
 * 없는 창작을 막는다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { BlueprintChart } from "./engine";
import { computeIndicators, type Indicators } from "./indicators";

export interface AnchorFacts {
  dayMaster: string;
  dayMasterElement: Element;
  strengthVerdict: string;
  strengthDetail: string;
  yongsin: Element[];
  huisin: Element[];   // 희신 — 용신을 돕는 오행
  gisin: Element[];    // 기신 — 용신을 해치는 오행
  climate: string;
  elements: Record<Element, number>;
  tenGodCounts: Record<string, number>;
  interactionsSummary: string[];
  salNames: string[];
  indicators: Indicators;
  daewoonNow: { ganji: string; ageRange: string } | null;
}

function elementThatGenerates(el: Element): Element {
  for (const [k, v] of Object.entries(C.GENERATES) as [Element, Element][]) if (v === el) return k;
  return el;
}
function elementThatControls(el: Element): Element {
  for (const [k, v] of Object.entries(C.CONTROLS) as [Element, Element][]) if (v === el) return k;
  return el;
}

/** 용신을 돕는(희신)/해치는(기신) 오행을 규칙적으로 도출한다. */
function deriveHuisinGisin(yongsin: Element[], isStrong: boolean, de: Element): { huisin: Element[]; gisin: Element[] } {
  const huisin = Array.from(new Set(yongsin.map((e) => elementThatGenerates(e))));
  // 기신은 일간을 과도하게 돕거나(신강일 때) 과도하게 빼앗는(신약일 때) 쪽 — strengthAssessment의 반대 세력
  const gisin = isStrong
    ? Array.from(new Set([de, elementThatGenerates(de)]))
    : Array.from(new Set([elementThatControls(de), C.GENERATES[de]]));
  return { huisin, gisin: gisin.filter((e) => !yongsin.includes(e)) };
}

function summarizeInteractions(chart: BlueprintChart): string[] {
  const i = chart.interactions;
  const out: string[] = [];
  for (const c of i.branch_clash) out.push(`${c.pos} ${c.pair} 충(沖)`);
  for (const c of i.stem_clash) out.push(`${c.pos} ${c.pair} 극충`);
  for (const c of i.branch_harm) out.push(`${c.pos} ${c.pair} 해(害)`);
  for (const c of i.branch_six_combine) out.push(`${c.pos} ${c.pair} 육합→${C.ELEMENT_KR[c.into]}`);
  for (const c of i.branch_three_combine) out.push(`${c.branches} ${c.type}→${C.ELEMENT_KR[c.into]}`);
  for (const c of i.stem_combine) out.push(`${c.pos} ${c.pair} 천간합→${C.ELEMENT_KR[c.into]}`);
  return out;
}

export function computeAnchorFacts(chart: BlueprintChart): AnchorFacts {
  const indicators = computeIndicators(chart);
  const yongsin = chart.yongsin.eokbu_candidates.length ? chart.yongsin.eokbu_candidates : chart.yongsin.johu_candidates;
  const { huisin, gisin } = deriveHuisinGisin(yongsin, chart.strength.is_strong, chart.day_master_element);

  const tenGodCounts: Record<string, number> = {};
  for (const label of Object.values(chart.ten_gods)) {
    if (label === "일간(본원)") continue;
    tenGodCounts[label] = (tenGodCounts[label] ?? 0) + 1;
  }

  // 만 나이 기준으로 "지금" 해당하는 대운 구간을 찾는다. list[0](첫 대운, 보통 1~10세)을
  // 무조건 쓰면 이미 성인인 사람에게도 유아기 대운을 "현재 대운"이라 소개하는 오류가 생긴다.
  const birthYear = new Date(chart.birth_iso).getUTCFullYear();
  const currentAge = new Date().getUTCFullYear() - birthYear;
  const list = chart.precise_daewoon.list;
  const dw = list.find((d) => currentAge >= d.start_age && currentAge <= d.end_age)
    ?? (currentAge < list[0]?.start_age ? list[0] : list[list.length - 1])
    ?? null;

  return {
    dayMaster: `${chart.day_master}(${C.STEM_KR[chart.day_master]})`,
    dayMasterElement: chart.day_master_element,
    strengthVerdict: chart.strength.verdict,
    strengthDetail: chart.strength.detail,
    yongsin,
    huisin,
    gisin,
    climate: chart.yongsin.climate,
    elements: chart.elements,
    tenGodCounts,
    interactionsSummary: summarizeInteractions(chart),
    salNames: chart.sal.map((s) => `${s.name}(${s.where})`),
    indicators,
    daewoonNow: dw ? { ganji: dw.ganji, ageRange: `${dw.start_age}~${dw.end_age}세` } : null,
  };
}

/** LLM 프롬프트에 그대로 붙일 수 있는 사실 시트 텍스트. 모든 호출이 이 문자열을 동일하게 받는다. */
export function anchorFactsToPromptText(f: AnchorFacts): string {
  const elemLine = (Object.entries(f.elements) as [Element, number][])
    .map(([e, v]) => `${C.ELEMENT_KR[e]}${v}`).join(" ");
  const tgLine = Object.entries(f.tenGodCounts).map(([k, v]) => `${k}${v}`).join(" ") || "없음";
  return `
[명식 사실 시트 — 모든 서술은 이 시트와 모순되면 안 됨]
일간: ${f.dayMaster} (${C.ELEMENT_KR[f.dayMasterElement]})
신강/신약: ${f.strengthVerdict} — ${f.strengthDetail}
용신: ${f.yongsin.map((e) => C.ELEMENT_KR[e]).join("·") || "없음"} / 희신: ${f.huisin.map((e) => C.ELEMENT_KR[e]).join("·") || "없음"} / 기신: ${f.gisin.map((e) => C.ELEMENT_KR[e]).join("·") || "없음"}
조후: ${f.climate}
오행 분포: ${elemLine}
십성: ${tgLine}
합충형해파: ${f.interactionsSummary.join(", ") || "특기할 합충 없음"}
신살: ${f.salNames.join(", ") || "없음"}
6대 지표(0~100): 축적력 ${f.indicators.accumulation} · 확장력 ${f.indicators.expansion} · 지구력 ${f.indicators.endurance} · 연결력 ${f.indicators.connection} · 회복력 ${f.indicators.recovery} · 변동성 ${f.indicators.volatility}
현재 대운: ${f.daewoonNow ? `${f.daewoonNow.ganji} (${f.daewoonNow.ageRange})` : "정보 없음"}`.trim();
}

export interface AnchorNarrative {
  constraints: [string, string]; // 구조적 제약 2 — 각 "제목 + 설명"
  leverages: [string, string];   // 지렛대 2
}

/** 앵커의 유일한 생성 파트 — 구조적 제약 2개 / 지렛대 2개. 사실 시트에 근거해야 하며, 다른 축 호출에도 그대로 재사용된다. */
export function buildAnchorNarrativePrompt(facts: AnchorFacts): string {
  return `당신은 명리학 데이터 분석가입니다. 아래 사실 시트만 근거로, 이 사주의
"구조적 제약 2개"와 "지렛대 2개"를 뽑으세요. 제약과 지렛대는 서로 다른 근거
(오행 부족/과다, 특정 십성 부재, 특정 합충)에서 나와야 하며 겹치면 안 됩니다.

${anchorFactsToPromptText(facts)}

다음 JSON으로만 응답하세요:
{
  "constraints": ["제약①. 제목 — 1~2문장 근거+영향", "제약②. 제목 — 1~2문장 근거+영향"],
  "leverages": ["지렛대①. 제목 — 1~2문장 근거+활용", "지렛대②. 제목 — 1~2문장 근거+활용"]
}

규칙: 반드시 사실 시트에 있는 오행·십성·합충·신살 용어를 인용할 것(지어내기 금지).
모든 문장은 존댓말(합니다/입니다체)로 끝낼 것 — "~다/~이다"로 끝나는 평서체 금지.
한국어. 마크다운 금지(#, ** 등). JSON 외 텍스트 금지.`;
}
