/**
 * llm.ts — 오행 보완 리포트 LLM 호출 공용 유틸.
 *
 * 이 상품의 LLM 호출은 두 곳으로 고정한다(CEO 확정 2026-08-31):
 *   ① 한 줄 진단 보충 2문장 (diagnosis.ts가 골격을 만듦)
 *   ② 3년 흐름 한 문단 (seun-narrative.ts)
 * 계산은 전부 코드로 나오므로 LLM은 이 두 곳의 짧은 해설만 쓴다. B층 관계 5블록은
 * LLM 재생성 없이 그대로 노출한다(relation.ts의 buildRelationDisplayBlock 참고).
 *
 * lib/premium/saju-generate.ts의 callJSON() 패턴을 그대로 따른다 — 스트리밍 호출(비
 * 스트리밍은 응답 대기 중 커넥션에 바이트가 안 흐르는 구간이 길어져 유휴 타임아웃에
 * 걸리기 쉽다), JSON 블록만 정규식으로 추출.
 */

export const WUXING_COMMON_RULES = `
규칙:
- 반드시 제공된 사실에만 근거해서 쓸 것. 새로운 사실을 지어내거나, 제공되지 않은 것을 계산하려 하지 말 것.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지).
- 한자가 나오면 처음 언급하는 자리에 한글 독음을 괄호로 병기. 예: 庚(경), 丙午(병오). 이미 한글로만 쓰인 단어에는 다시 붙이지 말 것.
- 모든 문장은 존댓말(-습니다/-입니다)로 끝낼 것. "당신"으로 직접 부를 것 — "이 사주는" 같은 3인칭 서술 금지.
- '엔진'·'AI'·'알고리즘'·'분석 시스템' 같은 표현 대신 자연스러운 한국어 문장으로 쓸 것. 단, 정해진 관용구를 문단 서두에 매번 반복하지 말 것 — 예시 문구를 그대로 복사해 쓰지 말고 문단마다 다른 문장으로 시작할 것.
- 사건 예측 금지 — 재물·연애·이직·건강의 구체적인 사건 발생을 말하지 말 것. "무엇을 채우고 덜어내는가"만 다룰 것.
- 성격·직업·연애를 해석하거나 단정하지 말 것 — 이 상품의 범위 밖이다.
- 제공된 사실 외의 명리 용어(신살·격국 등)를 새로 끌어오지 말 것.
- JSON 외 다른 텍스트 없이 JSON만 응답.`;

// ── 출력 검증 공용 primitives ─────────────────────────────────────────
// 프롬프트 RULES를 믿기만 하지 않고 출력을 다시 검사한다(diagnosis-narrative.ts·
// seun-narrative.ts 둘 다 이 셋을 쓴다 — 중복 정의하면 규칙을 한쪽만 고치는
// 사고가 나기 쉽다).
export const FORBIDDEN_MARKDOWN = /[*#`]|(?:^|\n)\s*-\s/;
export const FORBIDDEN_PHRASES = ["엔진", "알고리즘", "분석 시스템"] as const;
/** 문장 종결이 "-니다"류가 아니면 존댓말 규칙(WUXING_COMMON_RULES) 위반 */
export const INFORMAL_ENDING = /(?<!니)다[.]?\s*$/;

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 스트리밍으로 호출해 JSON을 파싱한다.
 * @param label 로그·에러 메시지 식별용 (예: "3년 흐름 문단")
 */
export async function callWuxingJSON<T>(prompt: string, maxTokens: number, label: string): Promise<Partial<T>> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const started = Date.now();
  const stream = client.messages.stream({
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const res = await stream.finalMessage();
  const elapsedMs = Date.now() - started;
  console.log(`wuxing [${label}] generated in ${elapsedMs}ms, usage=${JSON.stringify(res.usage)}`);
  const textBlock = res.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`wuxing [${label}]: JSON 없음. stop_reason=${res.stop_reason}`);
  }
  return JSON.parse(match[0]) as Partial<T>;
}
