/**
 * seun-narrative.ts — 3년을 관통하는 흐름 한 문단 (§10-5, §1-4의 LLM 생성 부분).
 *
 * §1의 연도별 표(간지·케이스·상태·지침)는 전부 코드가 고정 풀에서 뽑은 것이다.
 * 이 모듈이 만드는 건 그 세 해를 하나로 엮는 짧은 문단(2~3문장)뿐이다 — 문서
 * 예시: "2026~2027은 화토가 이어져 버티는 구간, 2028 무신년에 금수가 들어오며
 * 그동안 준비한 것이 작동하기 시작한다." 이런 형태를, 이번엔 존댓말로.
 *
 * LLM에게 새 사실을 계산하게 하지 않는다 — 3년치 케이스·간지·상태 문구를 전부
 * 프롬프트에 사실로 박아 넣고, LLM은 그걸 엮어 쓰는 역할만 한다. 대운 전환은
 * daewoonNote를 그대로 인용하게 해 특정 연도를 못 박는 사고(§1-7)를 막는다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import type { Classification } from "./classify";
import type { SeunPrescriptionPlan } from "./seun-prescription";
import { WUXING_COMMON_RULES, callWuxingJSON } from "./llm";

export interface SeunNarrativeResult {
  /** 3년을 관통하는 흐름 한 문단 (2~3문장, 존댓말) */
  narrative: string;
}

function chartFactsLine(chart: SajuChart, cls: Classification): string {
  const dayLabel = `${chart.day_master}(${C.STEM_KR[chart.day_master]}) — ${chart.day_master_element}(${C.ELEMENT_KR[chart.day_master_element]}) 일간`;
  const primaryLabel = cls.primary ? `${C.ELEMENT_KR[cls.primary]}(${cls.primary})` : "없음(오행이 고르게 갖춰짐)";
  const excessLabel = cls.excessive.length > 0 ? cls.excessive.map((e) => `${C.ELEMENT_KR[e]}(${e})`).join("·") : "없음";
  const frameLabel = cls.frame === "follow" ? "순응형(한 오행이 강하게 모여 그 기운을 따르는 처방)" : "보충형(부족한 오행을 채우는 처방)";
  return `일간: ${dayLabel} / 부족 오행: ${primaryLabel} / 과다 오행: ${excessLabel} / 처방 방향: ${frameLabel}`;
}

function yearsBlock(plan: SeunPrescriptionPlan): string {
  return plan.years
    .map((y) => `${y.year}년 ${y.ganji} — 케이스: ${y.caseLabel}(${y.incomingLine}) / 상태: ${y.statusLine} / 지침: ${y.guidelineLine}`)
    .join("\n");
}

function daewoonLine(plan: SeunPrescriptionPlan): string {
  return plan.daewoonNote.transition ?? plan.daewoonNote.background ?? "대운 정보 없음";
}

export function buildSeunNarrativePrompt(chart: SajuChart, cls: Classification, plan: SeunPrescriptionPlan): string {
  return `아래는 한 사람의 3년치(올해 포함) 세운 처방 사실이다. 이 세 해를 하나로 엮는 흐름 문단을 써라.

${chartFactsLine(chart, cls)}

[3년 처방]
${yearsBlock(plan)}

[대운]
${daewoonLine(plan)}

작성 지침:
- 위 3년의 케이스·상태·지침을 그대로 사실로 삼아, 그 흐름을 관통하는 문단 하나를 써라(2~3문장).
- 대운 문장은 위에 주어진 표현을 그대로 인용하라(특정 연도를 새로 지어내지 말 것 — 근사식이라 나이로만 표기돼 있다).
- 세 해의 케이스가 다르면 그 변화를("올해는 ~, 내년은 ~") 짚고, 같으면 그 지속성을 짚어라.
- 예시 구조(참고용, 그대로 베끼지 말 것): "2026~2027은 화토가 이어져 버티는 구간이고, 2028년 무신년에 금수가 들어오며 그동안 준비한 것이 작동하기 시작합니다."
${WUXING_COMMON_RULES}

JSON 스키마: {"narrative": "..."}`;
}

const FORBIDDEN_MARKDOWN = /[*#`]|(?:^|\n)\s*-\s/;
const FORBIDDEN_PHRASES = ["엔진", "알고리즘", "분석 시스템"] as const;
// 문장 종결이 "-니다"류가 아닌 채로 남아있으면 존댓말 규칙(WUXING_COMMON_RULES) 위반
const INFORMAL_ENDING = /(?<!니)다[.]?\s*$/;

/**
 * LLM 출력이 프롬프트 RULES를 실제로 지켰는지 가볍게 이중 확인한다. 프롬프트만
 * 믿고 그냥 내보내면, 규칙을 어긴 완성이 그대로 유저에게 노출될 수 있다. 문제가
 * 있으면 무엇이 걸렸는지 배열로 반환한다(빈 배열 = 문제 없음). API 호출 없이
 * 순수 문자열 검사라 테스트로 결정적으로 검증할 수 있다.
 */
export function validateSeunNarrative(text: string): string[] {
  const issues: string[] = [];
  if (FORBIDDEN_MARKDOWN.test(text)) issues.push("마크다운 기호 포함");
  for (const p of FORBIDDEN_PHRASES) if (text.includes(p)) issues.push(`금지 표현 포함: ${p}`);

  const sentences = text.split(/(?<=[.!?])\s*/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) issues.push("빈 문단");
  for (const s of sentences) {
    if (INFORMAL_ENDING.test(s)) issues.push(`존댓말 아님: "${s}"`);
  }
  if (sentences.length > 4) issues.push(`2~3문장 요청인데 ${sentences.length}문장`);

  return issues;
}

export async function generateSeunNarrative(
  chart: SajuChart,
  cls: Classification,
  plan: SeunPrescriptionPlan
): Promise<string> {
  const prompt = buildSeunNarrativePrompt(chart, cls, plan);
  const res = await callWuxingJSON<SeunNarrativeResult>(prompt, 400, "3년 흐름 문단");
  if (!res.narrative) {
    throw new Error("wuxing [3년 흐름 문단]: narrative 필드 없음");
  }
  const issues = validateSeunNarrative(res.narrative);
  if (issues.length > 0) {
    throw new Error(`wuxing [3년 흐름 문단]: 규칙 위반 — ${issues.join(" / ")}`);
  }
  return res.narrative;
}
