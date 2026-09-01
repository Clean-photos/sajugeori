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
import {
  WUXING_COMMON_RULES,
  callWuxingJSON,
  FORBIDDEN_MARKDOWN,
  FORBIDDEN_PHRASES,
  INFORMAL_ENDING,
  splitSentences,
} from "./llm";

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
- 대운 문장은 위에 주어진 표현을 그대로 인용하라(특정 연도를 새로 지어내지 말 것 — 근사식이라 나이로만 표기돼 있다). "2027년에 대운이 바뀝니다"처럼 대운 전환에 확정 연도를 붙이지 말 것 — "OO세 무렵" 형식만 허용된다.
- 세 해의 케이스가 다르면 그 변화를("올해는 ~, 내년은 ~") 짚고, 같으면 그 지속성을 짚어라.
- 예시 구조(참고용, 그대로 베끼지 말 것): "2026~2027은 화토가 이어져 버티는 구간이고, 2028년 무신년에 금수가 들어오며 그동안 준비한 것이 작동하기 시작합니다."
${WUXING_COMMON_RULES}

JSON 스키마: {"narrative": "..."}`;
}

// 대운 "전환"을 서술하는 절인지 판정하는 동사군. 절 단위로만 대운+연도 동시 등장을
// 검사하는 이유: 한 문장 안에 세운 연도("2028년...")와 대운 배경 언급("...戊戌 대운
// 안에서")이 콤마로 함께 섞여 나오는 게 정상 출력이라(실측: C케이스), 문장 전체를
// 기준으로 "대운"과 "20XX년"의 단순 동시 등장만 보면 오탐이 난다. 대운이 "바뀐다"고
// 실제로 주장하는 절에서만 연도를 확인해야 §1-7이 막으려는 사고와 정확히 겹친다.
const DAEWOON_TRANSITION_VERB = /바뀌|바뀐|바뀝|전환|교체|시작/;
// 끝에 \b를 두면 안 된다 — "년" 뒤에 "에"처럼 한글이 바로 이어지면 둘 다 \w가 아니라서
// 그 경계가 \b로 인식되지 않는다("2027년에"에서 년→에 사이는 word-boundary가 아님).
// 앞쪽 \b(숫자 직전)만으로도 "20XX년" 패턴을 구분하는 데는 충분하다.
const CALENDAR_YEAR = /\b(19|20)\d{2}\s*년/;
const AGE_BUFFER = /무렵/;

function clauses(text: string): string[] {
  return text.split(/[,，、.!?]/).map((s) => s.trim()).filter(Boolean);
}

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

  const sentences = splitSentences(text);
  if (sentences.length === 0) issues.push("빈 문단");
  for (const s of sentences) {
    if (INFORMAL_ENDING.test(s)) issues.push(`존댓말 아님: "${s}"`);
  }
  if (sentences.length > 4) issues.push(`2~3문장 요청인데 ${sentences.length}문장`);

  // §1-7 완충 표기 위반 — "대운이 바뀐다"고 말하는 절에 확정 연도가 박혀 있고
  // "OO세 무렵" 형태의 완충 표현이 없으면, approxDaewoonStart()의 ±1~2년 오차를
  // 특정 연도로 단정한 것이다("2027년에 대운이 바뀝니다" 같은 서술).
  for (const clause of clauses(text)) {
    const assertsTransition = clause.includes("대운") && DAEWOON_TRANSITION_VERB.test(clause);
    if (assertsTransition && CALENDAR_YEAR.test(clause) && !AGE_BUFFER.test(clause)) {
      issues.push(`대운 전환에 확정 연도 서술(§1-7 위반, "OO세 무렵" 형식이어야 함): "${clause}"`);
    }
  }

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
