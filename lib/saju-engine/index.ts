/**
 * Saju Engine public API.
 * Layer 1 — 계산만. 외부 의존 0. 캐릭터/LLM/결제 import 금지.
 */

import * as C from "./constants";
export { buildChart, calcYearPillar, calcDayPillar, stemBranchKr } from "./engine";
export { buildFacts, coreStructureTags, strengthsAndWeaknesses, daewoonNarrative } from "./facts";
export { pairAnalysis } from "./compatibility";
export type { SajuChart, Pillar, Pillars, StrengthResult, YongsinResult, DaewoonResult, SalEntry } from "./engine";

import { buildChart } from "./engine";
import { buildFacts } from "./facts";

/**
 * 메인 진입점. 생년월일시 → saju_raw(Layer A) + saju_json(Layer B).
 * 이 함수는 프로필 생성 시 단 1회만 호출한다.
 */
export function runSajuEngine(input: {
  birth_date: string;       // "YYYY-MM-DD"
  birth_time: string | null; // "HH:MM" or null
  calendar: "solar" | "lunar";
  gender: "M" | "F";
}) {
  // 음력 지원: 아직 미구현 — TODO: 음력→양력 변환 라이브러리 연동
  if (input.calendar === "lunar") {
    throw new Error("음력 변환 미구현. 양력으로 변환 후 입력하세요.");
  }

  const hasHour = input.birth_time !== null;
  const iso = hasHour
    ? `${input.birth_date}T${input.birth_time}:00`
    : `${input.birth_date}T00:00:00`;

  const chart = buildChart(iso, input.gender, hasHour);
  const facts = buildFacts(chart);

  // Layer A = 원시 계산 결과 (DB 저장용, LLM에 직접 전송 금지)
  const saju_raw = chart;

  // Layer B = AI-friendly profile (LLM/캐릭터 소비용)
  const saju_json = {
    schema_version: 1,
    identity: {
      day_master: `${chart.day_master}(${C.STEM_KR[chart.day_master]})`,
      day_master_element: chart.day_master_element,
      core_description: facts.gyeokguk.description,
      strength_level: strengthToLevel(chart.strength.ratio_support),
      strength_label: chart.strength.verdict,
    },
    pillars: chart.pillars,
    elements: chart.elements,
    ten_god_summary: facts.ten_god_summary.percent,
    core_tags: facts.core_structure,
    personality: {
      independence: 50,   // TODO: 규칙 기반 수치 산출
      sensitivity: 50,
      sociality: 50,
      competitiveness: 50,
      consistency: 50,
      strengths: facts.strengths_weaknesses.strengths,
      weaknesses: facts.strengths_weaknesses.weaknesses,
    },
    career: {
      score: 50,          // TODO: 규칙 기반 점수
      recommended_fields: [],
      work_style: [],
      risk_factors: facts.strengths_weaknesses.weaknesses.slice(0, 2),
    },
    love: { score: 50, relationship_strengths: [], relationship_risks: [] },
    money: { score: 50, earning_power: 50, saving_power: 50, wealth_pattern: facts.gyeokguk.description },
    health: { score: 50, watch_list: [] },
    life_patterns: { repeating_themes: facts.core_structure.map(t => t.tag), major_life_lessons: [] },
    current_phase: (() => {
      const cur = facts.daewoon_narrative.timeline[0];
      return cur ? { age_range: `${cur.start_age}-${cur.end_age}`, theme: cur.favorability, opportunities: [], warnings: [] }
                 : { age_range: "미정", theme: "계산중", opportunities: [], warnings: [] };
    })(),
    luck_cycles: facts.daewoon_narrative.timeline.map(d => ({
      start_age: d.start_age, end_age: d.end_age,
      ganji: d.ganji, favorability: d.favorability,
    })),
    yongsin: {
      eokbu: chart.yongsin.eokbu_candidates,
      johu: chart.yongsin.johu_candidates,
      climate: chart.yongsin.climate,
    },
  };

  return { saju_raw, saju_json };
}

function strengthToLevel(ratio: number): number {
  if (ratio >= 0.67) return 3;
  if (ratio >= 0.58) return 2;
  if (ratio >= 0.52) return 1;
  if (ratio >= 0.48) return 0;
  if (ratio >= 0.38) return -1;
  if (ratio >= 0.28) return -2;
  return -3;
}

/** chat context용 compact 버전 (200-400 tokens) */
export function toSajuCompact(saju_json: ReturnType<typeof runSajuEngine>["saju_json"]) {
  return {
    day_master: saju_json.identity.day_master,
    strength: saju_json.identity.strength_label,
    core_tags: saju_json.core_tags.map((t: {tag: string}) => t.tag),
    top_strengths: saju_json.personality.strengths.slice(0, 3),
    top_weaknesses: saju_json.personality.weaknesses.slice(0, 3),
    current_phase: `${saju_json.current_phase.age_range} ${saju_json.current_phase.theme}`,
  };
}
