/**
 * diagnosis-narrative.ts — 한 줄 진단 보충 2문장 (§10-5, §2-3의 LLM 생성 부분).
 *
 * 헤드라인은 diagnosis.ts가 코드로 이미 확정했다. 여기서는 그 뒤에 붙는 2문장만
 * LLM에 맡긴다 — 1문장은 명식 사실(오행 개수·월지·일간) 인용, 2문장은 B층 관계가
 * 이 사람에게 무엇을 뜻하는지 짧게 짚는다.
 *
 * ⚠️ B층 노출 방식 A안(CEO 확정) 이후: relation.json의 결핍 설명 전문은 리포트
 * §③ 본체에 이미 그대로 노출된다. 여기서 그 전문을 다시 통째로 베끼면 리포트
 * 안에서 같은 문단이 두 번 나오는 꼴이라, 2문장은 "예고" 수준의 짧은 요약만
 * 쓰게 한다 — dx.relation의 deficiency 원문은 근거로 주되 베끼지 말라고 못박는다.
 */
import type { DiagnosisSkeleton } from "./diagnosis";
import {
  WUXING_COMMON_RULES,
  callWuxingJSON,
  FORBIDDEN_MARKDOWN,
  FORBIDDEN_PHRASES,
  INFORMAL_ENDING,
  splitSentences,
} from "./llm";

export interface DiagnosisNarrativeResult {
  /** 1문장 — 명식 사실 인용 */
  sentence1: string;
  /** 2문장 — B층 관계 요약 (전문 아님, 짧은 예고) */
  sentence2: string;
}

function factsBlock(dx: DiagnosisSkeleton): string {
  return dx.facts.map((f) => `- ${f}`).join("\n");
}

function relationBlock(dx: DiagnosisSkeleton): string {
  if (!dx.relation) {
    return "이 사주는 부족한 오행이 따로 없어 오행이 고르게 갖춰져 있습니다. 결핍이 아니라 이 균형 자체가 2문장의 소재입니다.";
  }
  const r = dx.relation;
  return `이 사람은 ${r.label}(${r.keyword}) 관계에 해당합니다.
참고 원문(그대로 베끼지 말 것 — 전체 설명은 리포트 뒤쪽에 이미 그대로 나온다): "${r.deficiency}"`;
}

export function buildDiagnosisNarrativePrompt(dx: DiagnosisSkeleton): string {
  return `아래는 한 사람의 사주 판정 결과다. 이미 확정된 굵은 헤드라인 뒤에 이어질 두 문장을 써라.

[헤드라인] ${dx.headline.replace(/\*\*/g, "")}

[명식 사실 — 1문장은 이 중에서만 인용할 것. 새로 계산하거나 다른 사실을 지어내지 말 것]
${factsBlock(dx)}

[B층 관계 — 2문장의 재료]
${relationBlock(dx)}

작성 지침:
- 정확히 2문장. 1문장은 위 명식 사실을 인용해서 헤드라인의 근거를 짧게 설명. 2문장은 B층 관계가 이 사람에게 무엇을 뜻하는지 짧게 요약.
- 헤드라인 문구를 그대로 반복하지 말 것.
- B층 참고 원문을 통째로 베끼지 말 것 — 이미 리포트 뒤쪽에 전문이 그대로 나오므로, 여기서는 한 문장 예고만 할 것.
${WUXING_COMMON_RULES}

JSON 스키마: {"sentence1": "...", "sentence2": "..."}`;
}

/**
 * 프롬프트만 믿지 않고 출력을 다시 검사한다. sentence1·sentence2 각각 마크다운·
 * 금지표현·비존댓말 여부, 1문장 요청인데 여러 문장인지, 그리고 B층 원문을
 * 통째로 베꼈는지(리포트 안 중복 방지)를 확인한다.
 */
export function validateDiagnosisNarrative(dx: DiagnosisSkeleton, result: DiagnosisNarrativeResult): string[] {
  const issues: string[] = [];

  for (const [key, text] of [
    ["sentence1", result.sentence1],
    ["sentence2", result.sentence2],
  ] as const) {
    if (!text) {
      issues.push(`${key} 비어있음`);
      continue;
    }
    if (FORBIDDEN_MARKDOWN.test(text)) issues.push(`${key} 마크다운 기호 포함`);
    for (const p of FORBIDDEN_PHRASES) if (text.includes(p)) issues.push(`${key} 금지 표현 포함: ${p}`);
    if (INFORMAL_ENDING.test(text.trim())) issues.push(`${key} 존댓말 아님: "${text}"`);
    const count = splitSentences(text).length;
    if (count > 1) issues.push(`${key} 1문장 요청인데 ${count}문장`);
  }

  // B층 원문 통째로 복사 방지 — 리포트 §③ 본체에 이미 전문이 나오므로 여기서 또
  // 나오면 같은 문단이 두 번 노출된다. 원문 앞 30자 이상이 그대로 들어있으면 복사로 본다.
  if (dx.relation) {
    const excerpt = dx.relation.deficiency.slice(0, 30);
    if (result.sentence2.includes(excerpt)) {
      issues.push("sentence2가 B층 설명 원문을 그대로 복사함");
    }
  }

  return issues;
}

export async function generateDiagnosisNarrative(dx: DiagnosisSkeleton): Promise<DiagnosisNarrativeResult> {
  const prompt = buildDiagnosisNarrativePrompt(dx);
  const res = await callWuxingJSON<DiagnosisNarrativeResult>(prompt, 300, "한 줄 진단 보충 문장");
  if (!res.sentence1 || !res.sentence2) {
    throw new Error("wuxing [한 줄 진단 보충 문장]: sentence1/sentence2 필드 없음");
  }
  const result = { sentence1: res.sentence1, sentence2: res.sentence2 };
  const issues = validateDiagnosisNarrative(dx, result);
  if (issues.length > 0) {
    throw new Error(`wuxing [한 줄 진단 보충 문장]: 규칙 위반 — ${issues.join(" / ")}`);
  }
  return result;
}
