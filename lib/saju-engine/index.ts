/**
 * Saju Engine public API.
 * Layer 1 — 계산만. 외부 의존 0. 캐릭터/LLM/결제 import 금지.
 */

import * as C from "./constants";
export { buildChart, calcYearPillar, calcDayPillar, stemBranchKr } from "./engine";
export { buildFacts, coreStructureTags, strengthsAndWeaknesses, daewoonNarrative } from "./facts";
export { pairAnalysis } from "./compatibility";
export { scoreDate, rankDates } from "./taekil";
export type { TaekilPurpose, DayScore, TaekilResult } from "./taekil";
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
      const currentYear = new Date().getFullYear();
      const birthYear = parseInt(input.birth_date.slice(0, 4));
      const currentAge = currentYear - birthYear;
      const cur = facts.daewoon_narrative.timeline.find(
        (d) => currentAge >= d.start_age && currentAge <= d.end_age
      ) ?? facts.daewoon_narrative.timeline[0];
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

/** chat context용 compact 버전 — 개인 질문 답변에 충분한 데이터 포함 */
export function toSajuCompact(saju_json: ReturnType<typeof runSajuEngine>["saju_json"]) {
  // 용신 오행 → 개운 방향/색상/장소 매핑
  const elementGuide: Record<string, { direction: string; place: string; color: string }> = {
    "木": { direction: "동쪽", place: "숲·산·공원", color: "초록·청색" },
    "火": { direction: "남쪽", place: "따뜻한 곳·일조량 많은 도시", color: "빨강·주황" },
    "土": { direction: "중앙", place: "대지·농촌·내륙 도시", color: "황토·베이지" },
    "金": { direction: "서쪽", place: "도시·금속 산업 지역", color: "흰색·은색" },
    "水": { direction: "북쪽", place: "바다·강변·호수", color: "검정·진남색" },
  };
  const yongsinElements = saju_json.yongsin.eokbu.length > 0 ? saju_json.yongsin.eokbu : saju_json.yongsin.johu;
  const kaiun = yongsinElements.map((e: string) => elementGuide[e] ?? null).filter(Boolean);

  return {
    // 기본 정체성
    day_master: saju_json.identity.day_master,
    day_master_element: saju_json.identity.day_master_element,
    strength: saju_json.identity.strength_label,
    core_description: saju_json.identity.core_description,

    // 성격 강약
    top_strengths: saju_json.personality.strengths.slice(0, 4),
    top_weaknesses: saju_json.personality.weaknesses.slice(0, 4),

    // 오행 분포 (과다/부족 파악용)
    elements: saju_json.elements,

    // 용신 (개운의 핵심)
    yongsin: {
      eokbu: saju_json.yongsin.eokbu,
      johu: saju_json.yongsin.johu,
      climate: saju_json.yongsin.climate,
    },

    // 개운 가이드 (여행지·색상·방향)
    kaiun_guide: kaiun,

    // 현재 대운 흐름
    current_phase: {
      age_range: saju_json.current_phase.age_range,
      theme: saju_json.current_phase.theme,
      opportunities: saju_json.current_phase.opportunities,
      warnings: saju_json.current_phase.warnings,
    },
    next_luck_cycle: saju_json.luck_cycles[1] ?? null,

    // 직업·재물 (score는 규칙 미구현 placeholder라 LLM 입력에서 제외 — 가짜 정밀도 방지)
    career: {
      work_style: saju_json.career.work_style.slice(0, 3),
      risk_factors: saju_json.career.risk_factors.slice(0, 2),
    },

    // 연애·관계 (score 제외 — 위와 동일)
    love: {
      relationship_strengths: saju_json.love.relationship_strengths.slice(0, 2),
      relationship_risks: saju_json.love.relationship_risks.slice(0, 2),
    },

    // 핵심 태그
    core_tags: saju_json.core_tags.map((t: {tag: string}) => t.tag),
  };
}
