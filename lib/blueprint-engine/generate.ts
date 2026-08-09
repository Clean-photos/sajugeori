/**
 * generate.ts — 운명 설계도 생성 오케스트레이터.
 * 순서: 앵커(제약·지렛대) 1콜 → [총론 + 축1~4] 5콜 병렬 → 실행설계·조언5 1콜. 총 7콜.
 * (스펙 8장 "축 단위 병렬 호출"을 만족하면서, 조언5는 축 결과를 재인용해야 하므로 마지막에 순차 배치)
 */
import { buildPreciseChart, type BlueprintChart } from "./engine";
import { computeAnchorFacts, buildAnchorNarrativePrompt, type AnchorFacts, type AnchorNarrative } from "./anchor";
import { buildOverviewPrompt, buildAxisPrompt, buildClosingPrompt } from "./prompts";
import { AXES, type QABlock } from "./questions";

export interface BlueprintReport {
  chart: BlueprintChart;
  facts: AnchorFacts;
  narrative: AnchorNarrative;
  overview: { headline: string; body: string };
  axes: { id: string; title: string; subtitle: string; questions: QABlock[] }[];
  closing: {
    keep: string[]; stop: string[]; start: string[];
    recheckPoints: string[]; advice: string[];
  };
  meta: {
    generatedAt: string; totalChars: number; gradeACounts: number; gradeTotalCounts: number;
    inputTokens: number; outputTokens: number; callCount: number;
  };
}

interface UsageAccumulator { input: number; output: number; calls: number }

// 모듈 전역이 아니라 호출부(generateBlueprintReport)가 만들어 넘기는 인스턴스에 누적한다 —
// 서버에서 동시에 여러 요청이 들어와도 서로 다른 리포트의 토큰 사용량이 섞이지 않도록.
async function callJSON<T>(prompt: string, maxTokens: number, usage: UsageAccumulator): Promise<T> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  usage.input += res.usage.input_tokens;
  usage.output += res.usage.output_tokens;
  usage.calls += 1;
  const textBlock = res.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`JSON 매칭 실패. stop_reason=${res.stop_reason}, text 앞부분: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(match[0]) as T;
  } catch (e) {
    throw new Error(`JSON 파싱 실패(stop_reason=${res.stop_reason}, len=${match[0].length}): ${(e as Error).message}\n원문:\n${match[0]}`);
  }
}

export async function generateBlueprintReport(birthIso: string, gender: string, hasHour = true): Promise<BlueprintReport> {
  const chart = buildPreciseChart(birthIso, gender, hasHour);
  const facts = computeAnchorFacts(chart);
  const usage: UsageAccumulator = { input: 0, output: 0, calls: 0 };

  // 1) 앵커 — 제약 2 / 지렛대 2
  const narrative = await callJSON<AnchorNarrative>(buildAnchorNarrativePrompt(facts), 2000, usage);

  // 2) 총론 + 축 4개 — 병렬
  const [overview, ...axisResults] = await Promise.all([
    callJSON<{ headline: string; body: string }>(buildOverviewPrompt(facts, narrative), 2000, usage),
    ...AXES.map((axis) => callJSON<{ questions: QABlock[] }>(buildAxisPrompt(axis, facts, narrative), 8500, usage)),
  ]);

  const axes = AXES.map((axis, i) => ({
    id: axis.id, title: axis.title, subtitle: axis.subtitle,
    questions: axisResults[i].questions.map((q) => ({
      ...q, question: axis.questions.find((defQ) => defQ.id === q.id)?.q ?? "",
    })),
  }));

  // 3) 실행설계 + 조언5 — 축 판정 요약을 재인용해야 하므로 마지막에 순차 호출
  const axisSummaries = axes.map((a) => ({ title: a.title, verdicts: a.questions.map((q) => q.verdict) }));
  const closing = await callJSON<BlueprintReport["closing"]>(
    buildClosingPrompt(facts, narrative, axisSummaries), 3500, usage
  );

  // 근거 강도 분포 집계(스펙 7장 "A 비중 40% 이하" 자동 검사용)
  const allGrades = axes.flatMap((a) => a.questions.map((q) => q.evidenceGrade));
  const gradeACounts = allGrades.filter((g) => g === "A").length;

  const totalChars =
    overview.headline.length + overview.body.length +
    axes.reduce((sum, a) => sum + a.questions.reduce((s, q) =>
      s + q.verdict.length + q.metrics.length + q.why.length + q.scenes.join("").length + q.counterEvidence.length + q.actions.join("").length, 0), 0) +
    closing.advice.join("").length + closing.keep.join("").length + closing.stop.join("").length + closing.start.join("").length;

  return {
    chart, facts, narrative, overview, axes, closing,
    meta: {
      generatedAt: new Date().toISOString(), totalChars, gradeACounts, gradeTotalCounts: allGrades.length,
      inputTokens: usage.input, outputTokens: usage.output, callCount: usage.calls,
    },
  };
}
