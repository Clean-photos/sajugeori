// 990원 상품 단일 호출로 6000토큰까지 늘리면 compat-generate.ts와 같은 이유로
// Vercel Hobby의 60초 상한을 넘길 위험이 크다(궁합에서 72.6초 실측). 2콜로
// 쪼갰었지만, "검출된 신살마다 3~4문장씩"이라 신살이 많이 검출된 사주는
// 앞부분 한 콜만으로도 오래 걸려 전체 60초를 넘겨 504가 나는 사례가 실측
// 확인됐다(2026-08-20). 3콜로 더 잘게 쪼개고 스트리밍으로 유휴 타임아웃도 방지.

const COMMON_RULES = `
규칙:
- 반드시 위 데이터에 근거. 위 데이터에 없는 신살을 지어내지 말 것.
- 신살은 사주 해석의 보조 요소임을 잊지 말고, 하나의 살로 운명을 단정하는 서술 금지.
- 겁을 주거나 불안을 조장하는 표현 금지. 흉살도 중립적 에너지로 설명하고 활용법을 함께 제시할 것.
- 부적·굿·비방 등 해소를 위한 금전 지출을 암시하는 서술 절대 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 寅申(인신)충. 단, 이미 한글로만 쓰인 단어에는 괄호로 같은 한글을 또 붙이지 말 것.
- 문단은 2~3문장마다 끊고 빈 줄(줄바꿈 두 번)로 나눌 것 — 한 문단에 4문장 이상을 몰아넣지 말 것.
- 신살·오행·일간 등 사주 용어가 나오면 처음 언급하는 자리에서 괄호 안에 쉬운 현대식 설명을 짧게 덧붙일 것. 예: 괴강살(魁罡殺, 강한 카리스마와 승부 근성을 뜻하는 살), 백호살(白虎殺, 강렬한 에너지가 압축되어 있는 살), 무토(戊土, 넓고 든든한 산 같은 기운). 전문 용어를 처음 접하는 독자도 이해할 수 있도록 최대한 친절하게 풀어 쓸 것.
- '엔진', 'AI', '알고리즘', '분석 시스템' 같은 표현은 절대 쓰지 말 것. 대신 "사주에 따르면", "명리학적으로 보면" 같은 자연스러운 표현을 쓸 것.
- JSON이나 다른 포맷 없이 순수 텍스트로만 응답.`;

async function callText(prompt: string, maxTokens: number, label: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const started = Date.now();
  const stream = client.messages.stream({
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const res = await stream.finalMessage();
  console.log(`premium salpuri report [${label}] generated in ${Date.now() - started}ms, usage=${JSON.stringify(res.usage)}`);
  const textBlock = res.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  if (!text) throw new Error(`빈 응답 [${label}] (stop_reason=${res.stop_reason})`);
  return text;
}

/** 신살 검출 데이터로 프리미엄 살풀이 리포트 전문을 생성한다. */
export async function generateSalpuriReport(engineSummary: string): Promise<string> {
  const [part1, part2, part3] = await Promise.all([
    callText(`당신은 명리학 대가입니다. 아래는 이 사람의 사주에서 실제로 검출한 신살(神殺) 데이터입니다.
이 데이터로 유료 프리미엄 "살풀이" 리포트의 첫 부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가
확연히 달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 내 사주의 살 】
(검출된 신살을 하나씩 짚어 주되, 각 살마다 최소 3~4문장: 그 살이 어느 자리(연지·월지·일지·시지)에 있는지, 그래서 어떤 영역에 작용하는지, 이 사람 사주 전체(일간·신강신약) 맥락에서 어떤 의미를 갖는지. 연지=조상·초년, 월지=부모·사회활동, 일지=배우자·본인, 시지=자식·말년. 검출된 살이 없으면 "뚜렷한 신살이 없다"는 것이 무엇을 뜻하는지 5~6문장으로 충실히 설명할 것.)
${COMMON_RULES}`, 4200, "part1"),

    callText(`당신은 명리학 대가입니다. 아래는 이 사람의 사주에서 실제로 검출한 신살(神殺) 데이터입니다.
이 데이터로 유료 프리미엄 "살풀이" 리포트의 중간 부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가
확연히 달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 강점으로 쓰는 법 】
(검출된 살 하나하나가 지닌 긍정적 면과 그것을 살릴 수 있는 구체적 방향을 각 3~4문장씩. 실제 직업·상황 예시를 곁들일 것.)

【 조심할 지점 】
(각 살의 그림자와 실제로 조심할 상황을 각 3~4문장씩. 겁주지 말고 담담하게, 구체적인 생활 장면으로.)
${COMMON_RULES}`, 4200, "part2"),

    callText(`당신은 명리학 대가입니다. 아래는 이 사람의 사주에서 실제로 검출한 신살(神殺) 데이터입니다.
이 데이터로 유료 프리미엄 "살풀이" 리포트의 마지막 부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가
확연히 달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 신강·신약과 살의 상호작용 】
(이 사람의 신강·신약, 용신 상태가 위 신살들의 발현 방식에 어떤 영향을 주는지 5~6문장. 예: 신약한데 강한 살이 있으면 부담이 크고, 신강하면 살을 다스릴 힘이 있다는 식의 원리를 이 사람 데이터로 구체화.)

【 종합 조언 】
(5~6문장. 신강·신약과 용신을 함께 고려해 실용적으로, 일상에서 바로 적용할 수 있게.)
${COMMON_RULES}`, 3000, "part3"),
  ]);

  return [part1, part2, part3].join("\n\n");
}
