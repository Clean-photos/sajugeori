// 990원 상품 단일 호출로 6500토큰까지 늘리면 compat-generate.ts와 같은 이유로
// Vercel Hobby의 60초 상한을 넘길 위험이 크다(궁합에서 72.6초 실측). 앞부분
// (택일 기준·추천 날짜)과 뒷부분(피해야 할 날·우선순위 정리·시간대 조언)을
// 병렬 2콜로 쪼갠다.

const COMMON_RULES = `
규칙:
- 반드시 위 엔진 데이터에 근거. 엔진이 준 날짜 외 임의 날짜 생성 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 寅申(인신)충. 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
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

/** 일진 스코어링 데이터로 프리미엄 택일 리포트 전문을 생성한다. */
export async function generateTaekilReport(engineSummary: string, purposeLabel: string): Promise<string> {
  const [front, back] = await Promise.all([
    callText(`당신은 명리학 택일 대가입니다. 아래는 사주 엔진이 실제 일진(日辰)을 계산해 산출한 택일 데이터입니다.
이 데이터로 유료 프리미엄 택일 리포트의 앞부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히
달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 택일 기준 】
(이 사람의 사주 관점에서 왜 이런 날들이 좋은지, 일간·용신과 일진의 관계 원칙을 4~5문장으로 충실히.)

【 추천 날짜 】
(위 최길일 후보를 좋은 순서대로 정리. 각 날짜마다 "YYYY-MM-DD (요일) — " 다음에 이 사람에게 왜 좋은지 3~4문장: 그날 일진의 오행·합충이 이 사람의 용신·일간과 어떻게 맞물리는지, 이 목적(${purposeLabel})에 특히 왜 좋은지. 엔진이 준 날짜만 사용하고 임의로 다른 날짜를 만들지 말 것.)
${COMMON_RULES}`, 3500),
    callText(`당신은 명리학 택일 대가입니다. 아래는 사주 엔진이 실제 일진(日辰)을 계산해 산출한 택일 데이터입니다.
이 데이터로 유료 프리미엄 택일 리포트의 뒷부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히
달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 피해야 할 날 】
(엔진이 준 피할 날을 각각 2~3문장으로 이유와 함께. 없으면 "이 기간에는 크게 피할 날이 없습니다"라고 쓸 것.)

【 날짜별 우선순위 정리 】
(추천 날짜들을 이 사람에게 가장 좋은 순서로 다시 한번 요약하고, 하나만 고른다면 어떤 기준으로 골라야 할지 4~5문장.)

【 시간대·실행 조언 】
(목적(${purposeLabel})에 맞는 실용적 조언 5~6문장. 당일 준비할 것, 피할 행동까지 구체적으로.)
${COMMON_RULES}`, 3000),
  ]);

  return [front, back].join("\n\n");
}
