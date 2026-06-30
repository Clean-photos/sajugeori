/**
 * 기준 명식 검증 테스트
 * 1989-03-21 19:30 남성 → 己巳 丁卯 庚辰 丙戌
 *
 * 실행: npx tsx lib/saju-engine/engine.test.ts
 */

import { buildChart, stemBranchKr } from "./engine";
import { buildFacts } from "./facts";

const birth = "1989-03-21T19:30:00";
const chart = buildChart(birth, "M", true);

console.log("=== 기준 명식 검증 ===");
console.log(`연주: ${stemBranchKr(chart.pillars.year.stem, chart.pillars.year.branch)}`);
console.log(`월주: ${stemBranchKr(chart.pillars.month.stem, chart.pillars.month.branch)}`);
console.log(`일주: ${stemBranchKr(chart.pillars.day.stem, chart.pillars.day.branch)}`);
console.log(`시주: ${chart.pillars.hour ? stemBranchKr(chart.pillars.hour.stem, chart.pillars.hour.branch) : "(없음)"}`);
console.log(`\n기대값: 己巳 丁卯 庚辰 丙戌`);

const facts = buildFacts(chart);
console.log(`\n격국: ${facts.gyeokguk.name}`);
console.log(`신강약: ${chart.strength.verdict}`);
console.log(`용신(억부): ${chart.yongsin.eokbu_candidates.join(",")}`);
console.log(`조후: ${chart.yongsin.climate}`);
console.log(`\n핵심 태그:`);
facts.core_structure.forEach(t => console.log(`  - ${t.tag}: ${t.label}`));
console.log(`\n강점: ${facts.strengths_weaknesses.strengths.join(" / ")}`);
console.log(`약점: ${facts.strengths_weaknesses.weaknesses.join(" / ")}`);
console.log(`\n신살: ${chart.sal.map(s => s.name).join(", ") || "없음"}`);
console.log(`\n대운 (처음 3개):`);
chart.daewoon.list.slice(0,3).forEach(d => console.log(`  ${d.start_age}세: ${d.ganji} (${facts.daewoon_narrative.timeline[d.index-1]?.favorability})`));
