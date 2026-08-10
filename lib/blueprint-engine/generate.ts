/**
 * generate.ts — 운명 설계도 생성 오케스트레이터.
 * 순서: 앵커(제약·지렛대) 1콜 → [총론 + 축1~4] 5콜 병렬 → 실행설계·조언5 1콜. 총 7콜.
 * (스펙 8장 "축 단위 병렬 호출"을 만족하면서, 조언5는 축 결과를 재인용해야 하므로 마지막에 순차 배치)
 */
import { buildPreciseChart, type BlueprintChart } from "./engine";
import { computeAnchorFacts, buildAnchorNarrativePrompt, type AnchorFacts, type AnchorNarrative } from "./anchor";
import { buildOverviewPrompt, buildAxisGroupPrompt, buildClosingPrompt } from "./prompts";
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

/** 점진 저장을 위해 완료 즉시 넘겨주는 조각. axes는 완료된 축 하나만 담긴 배열(호출부가 id로 머지). */
export interface BlueprintPartial {
  chart?: BlueprintChart;
  facts?: AnchorFacts;
  narrative?: AnchorNarrative;
  overview?: { headline: string; body: string };
  axes?: { id: string; title: string; subtitle: string; questions: QABlock[] }[];
  closing?: BlueprintReport["closing"];
  meta?: BlueprintReport["meta"];
}

export type BlueprintPartKey = "chart" | "narrative" | "overview" | `axis_${string}` | "closing";

/** 이미 완료된 파트는 다시 부르지 않고, 남은 파트만 재실행하기 위한 이어하기 입력. */
export interface BlueprintResumeState {
  chart?: BlueprintChart;
  facts?: AnchorFacts;
  narrative?: AnchorNarrative;
  overview?: { headline: string; body: string };
  axes?: { id: string; title: string; subtitle: string; questions: QABlock[] }[];
}

export interface BlueprintStepResult {
  part: BlueprintPartKey;
  partial: BlueprintPartial;
  isFinal: boolean;
  report?: BlueprintReport;
}

// 축 질문을 몇 개씩 묶어 호출할지. 실측 결과 질문 하나의 답변이 매우
// 길어서(장면 3개+상세 근거 등, 단일 질문에 ~3000토큰 가까이 씀) 2개씩
// 묶으면 60초를 넘기거나 토큰 예산이 모자라 중간에 잘렸다(2026-08-09 실측).
// 그래서 질문 1개씩 쪼갠다 — 축 하나(6문항)가 폴링 1회에서 6개 병렬 호출로
// 처리되고, 벽시계 시간은 그 중 가장 느린 호출 하나에 좌우된다.
const AXIS_GROUP_SIZE = 1;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 한 번의 HTTP 요청(=폴링 1회) 안에서 확실히 끝나는 "스텝 하나"만 진행한다.
 * Vercel Hobby 플랜은 함수 실행시간이 60초로 묶여 있어 after()로 백그라운드
 * 실행을 이어갈 수 없다 — 그래서 라우트가 폴링마다 이 함수를 한 번씩 불러
 * 다음 미완료 파트 하나(총론 또는 축 하나, 축은 내부적으로 2문항씩 병렬
 * 호출)만 만들고 돌려준다. resume에 없는 것부터 순서대로(narrative →
 * overview → axis×4 → closing) 진행하므로, 실패했던 스텝만 자연스럽게
 * 재시도되고 이미 끝난 스텝은 다시 부르지 않는다.
 */
export async function runBlueprintStep(
  resume: BlueprintResumeState,
  birthIso: string,
  gender: string,
  hasHour: boolean
): Promise<BlueprintStepResult> {
  const chart = resume.chart ?? buildPreciseChart(birthIso, gender, hasHour);
  const facts = resume.facts ?? computeAnchorFacts(chart);
  const usage: UsageAccumulator = { input: 0, output: 0, calls: 0 };

  if (!resume.narrative) {
    const narrative = await callJSON<AnchorNarrative>(buildAnchorNarrativePrompt(facts), 2000, usage);
    return { part: "narrative", partial: { chart, facts, narrative }, isFinal: false };
  }
  const narrative = resume.narrative;

  if (!resume.overview) {
    const overview = await callJSON<{ headline: string; body: string }>(buildOverviewPrompt(facts, narrative), 2000, usage);
    return { part: "overview", partial: { overview }, isFinal: false };
  }
  const overview = resume.overview;

  const doneAxisIds = new Set((resume.axes ?? []).map((a) => a.id));
  const nextAxis = AXES.find((a) => !doneAxisIds.has(a.id));
  if (nextAxis) {
    const groups = chunk(nextAxis.questions, AXIS_GROUP_SIZE);
    const groupResults = await Promise.all(
      groups.map((g) => callJSON<{ questions: QABlock[] }>(buildAxisGroupPrompt(nextAxis.title, g, facts, narrative), 3500, usage))
    );
    const questions = groupResults.flatMap((r) => r.questions).map((q) => ({
      ...q, question: nextAxis.questions.find((defQ) => defQ.id === q.id)?.q ?? "",
    }));
    const built = { id: nextAxis.id, title: nextAxis.title, subtitle: nextAxis.subtitle, questions };
    return { part: `axis_${nextAxis.id}`, partial: { axes: [built] }, isFinal: false };
  }

  // 총론·앵커·4축 전부 완료 — 마지막 스텝: 실행설계 + 조언5. 여기서 리포트를 완성한다.
  const axes = resume.axes!;
  const axisSummaries = axes.map((a) => ({ title: a.title, verdicts: a.questions.map((q) => q.verdict) }));
  const closing = await callJSON<BlueprintReport["closing"]>(buildClosingPrompt(facts, narrative, axisSummaries), 3500, usage);

  const allGrades = axes.flatMap((a) => a.questions.map((q) => q.evidenceGrade));
  const gradeACounts = allGrades.filter((g) => g === "A").length;
  const totalChars =
    overview.headline.length + overview.body.length +
    axes.reduce((sum, a) => sum + a.questions.reduce((s, q) =>
      s + q.verdict.length + q.metrics.length + q.why.length + q.scenes.join("").length + q.counterEvidence.length + q.actions.join("").length, 0), 0) +
    closing.advice.join("").length + closing.keep.join("").length + closing.stop.join("").length + closing.start.join("").length;

  const meta = {
    generatedAt: new Date().toISOString(), totalChars, gradeACounts, gradeTotalCounts: allGrades.length,
    inputTokens: usage.input, outputTokens: usage.output, callCount: usage.calls,
  };
  const report: BlueprintReport = { chart, facts, narrative, overview, axes, closing, meta };
  return { part: "closing", partial: { closing, meta }, isFinal: true, report };
}

/** 스텝을 끝까지 반복 실행하는 헬퍼. 서버리스 시간 제한이 없는 수동 스크립트(샘플 생성용)에서만 쓴다. */
export async function generateBlueprintReport(birthIso: string, gender: string, hasHour = true): Promise<BlueprintReport> {
  let resume: BlueprintResumeState = {};
  for (;;) {
    const result = await runBlueprintStep(resume, birthIso, gender, hasHour);
    if (result.isFinal && result.report) return result.report;
    resume = {
      chart: result.partial.chart ?? resume.chart,
      facts: result.partial.facts ?? resume.facts,
      narrative: result.partial.narrative ?? resume.narrative,
      overview: result.partial.overview ?? resume.overview,
      axes: result.partial.axes ? [...(resume.axes ?? []), ...result.partial.axes] : resume.axes,
    };
  }
}
