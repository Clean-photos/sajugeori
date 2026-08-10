import type { mutualAnalysis } from "@/lib/saju-engine/compatibility";

// 990원 상품 단일 호출로 6000토큰까지 늘렸더니 실측 72.6초로 Vercel Hobby의
// 60초 상한을 넘겼다(2026-08-10 실측). 앞부분(종합·서로 주고받는 것·잘 맞는
// 부분)과 뒷부분(주의할 부분·시기별 차이·조언·한줄요약)을 병렬 2콜로 쪼갠다.

const CONTEXT_LABEL: Record<string, string> = {
  romance: "연애·결혼", work: "직장·비즈니스", friend: "친구·지인",
};

const COMMON_RULES = `
규칙:
- 반드시 위 엔진 데이터에 근거. 과장·미신적 단정 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 巳申(사신)합. 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
- 나이 차이(연상·연하 등)는 이 분석의 근거가 아니므로 언급하지 말 것.
- JSON이나 다른 포맷 없이 순수 텍스트로만 응답.`;

async function callText(prompt: string, maxTokens: number): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  if (!text) throw new Error(`빈 응답 (stop_reason=${res.stop_reason})`);
  return text;
}

type Ctx = "romance" | "work" | "friend";
type Mutual = ReturnType<typeof mutualAnalysis>;

/** 양방향 궁합 분석 데이터로 프리미엄 궁합 리포트 전문을 생성한다. */
export async function generateCompatibilityReport(
  mutual: Mutual, context: Ctx, normalizedScore: number
): Promise<string> {
  const engineSummary = `
관계 유형: ${CONTEXT_LABEL[context] ?? context}
종합 궁합 점수: ${normalizedScore}/100

[상대가 나에게 주는 것 — 상대→나 분석]
${mutual.partnerToMe.notes.map((n) => `- ${n}`).join("\n") || "- 특별한 상호작용 없음"}

[내가 상대에게 주는 것 — 나→상대 분석]
${mutual.meToPartner.notes.map((n) => `- ${n}`).join("\n") || "- 특별한 상호작용 없음"}`.trim();

  const [front, back] = await Promise.all([
    callText(`당신은 명리학 궁합 대가입니다. 아래는 사주 엔진이 두 사람의 사주를 양방향으로 분석한 데이터입니다.
이 데이터로 유료 프리미엄 궁합 리포트의 앞부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히
달라야 합니다. 특히 "서로 주고받는 것"의 양방향 흐름을 살려서 작성하세요.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 종합 궁합 】 ${normalizedScore}점 / 100점
(두 사람의 궁합을 5~6문장으로 총평. 관계 유형(${CONTEXT_LABEL[context] ?? context})에 맞게, 점수가 왜 이렇게 나왔는지 근거를 짚어가며.)

【 서로에게 주는 것 】
(상대가 나에게 채워주는 것과, 내가 상대에게 채워주는 것을 각각 4~5문장으로. 위 엔진 데이터의 각 항목을 하나씩 짚어가며 구체적으로 풀고, 양방향의 차이를 분명히 드러낼 것.)

【 잘 맞는 부분 】
(구체적 강점 3~4가지. 각 강점마다 엔진 데이터 근거 + 실생활에서 어떻게 드러나는지 2~3문장씩.)
${COMMON_RULES}`, 3200),
    callText(`당신은 명리학 궁합 대가입니다. 아래는 사주 엔진이 두 사람의 사주를 양방향으로 분석한 데이터입니다.
이 데이터로 유료 프리미엄 궁합 리포트의 뒷부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히
달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 주의할 부분 】
(마찰·소모 가능성 3~4가지. 각각 왜 생기는지와 실생활 장면을 2~3문장씩. 없으면 솔직히 "큰 마찰 요인은 적습니다"라고 쓸 것.)

【 시기별로 다르게 나타나는 점 】
(관계 초반과 시간이 흐른 뒤, 이 궁합이 어떻게 다르게 느껴지는지 4~5문장. 엔진 데이터에서 도출 가능한 범위 내에서.)

【 관계를 위한 조언 】
(관계 유형에 맞는 실용적 조언 5~6문장. 위에서 짚은 마찰 지점을 구체적으로 어떻게 다루면 좋을지 포함.)

【 한줄 요약 】
(60자 이내 한 문장, 마침표로 끝낼 것.)
${COMMON_RULES}`, 3200),
  ]);

  return [front, back].join("\n\n");
}
