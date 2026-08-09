/**
 * 실제 LLM 호출로 샘플 리포트를 생성해 글자수·근거강도 비율을 실측한다.
 * 비용이 드는 실제 API 호출이므로 자동 실행되지 않음 — 수동 실행 전용.
 * 실행: npx tsx lib/blueprint-engine/generate.sample.ts
 */
import { readFileSync } from "fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

import { generateBlueprintReport } from "./generate";

async function main() {
  const started = Date.now();
  const report = await generateBlueprintReport("1989-03-21T18:50:00", "F", true);
  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);

  console.log("=== 운명총론 ===");
  console.log(report.overview.headline);
  console.log(report.overview.body);

  console.log("\n=== 축 1개 샘플(생계 엔진 Q1) ===");
  console.log(JSON.stringify(report.axes[0].questions[0], null, 2));

  console.log("\n=== 실행설계·조언5 ===");
  console.log(JSON.stringify(report.closing, null, 2));

  console.log("\n=== 실측 ===");
  console.log(`생성 시간: ${elapsedSec}초`);
  console.log(`총 글자수: ${report.meta.totalChars}자 (스펙 기준 9,000자 이상)`);
  console.log(`근거강도 A 비율: ${report.meta.gradeACounts}/${report.meta.gradeTotalCounts} = ${Math.round(report.meta.gradeACounts / report.meta.gradeTotalCounts * 100)}% (스펙 기준 40% 이하)`);
  console.log(`구조적 제약: ${report.narrative.constraints.join(" | ")}`);
  console.log(`지렛대: ${report.narrative.leverages.join(" | ")}`);

  const { inputTokens, outputTokens, callCount } = report.meta;
  // Claude Sonnet 정가 기준(2026) 개략 단가: 입력 $3/M, 출력 $15/M — 실제 계약 단가는 다를 수 있음
  const usdCost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  console.log(`LLM 호출 수: ${callCount} / 입력 토큰: ${inputTokens} / 출력 토큰: ${outputTokens}`);
  console.log(`정가 기준 원가 추정: $${usdCost.toFixed(4)} (약 ${Math.round(usdCost * 1450)}원, 환율 1450원 가정)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
