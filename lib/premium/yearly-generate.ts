import type { MonthScore, YearlyResult } from "@/lib/saju-engine";

// Vercel이 Hobby 플랜이라 함수 실행시간이 60초로 묶여 있다(lib/blueprint-engine와
// 동일 제약). 3배 분량 요구를 한 번의 긴 LLM 호출로 채우면 60초를 넘기기 쉬워,
// 총운/분기요약/월별 흐름(4분기)/재물·관계·조언을 6개의 병렬 호출로 쪼갠다 —
// 서로 의존하지 않아 Promise.all로 동시에 돌리면 벽시계 시간은 가장 느린 호출
// 하나에만 좌우된다(원래 3500토큰 단일 호출보다 오히려 더 빠르고 안전하다).

const COMMON_RULES = `
규칙:
- 반드시 아래 엔진 데이터에 근거. 엔진이 준 달·점수와 모순되는 서술 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 丙午(병오)년, 寅申(인신)충. 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
- 긴 서술 섹션(총운·재물·관계·조언)은 2~3문장마다 끊고 빈 줄(줄바꿈 두 번)로 나눌 것 — 한 문단에 4문장 이상을 몰아넣지 말 것.
- 세운·용신 등 사주 용어가 나오면 처음 언급하는 자리에서 괄호 안에 쉬운 현대식 설명을 짧게 덧붙일 것. 예: 세운(歲運, 그해 한 해를 지배하는 기운), 용신(用神, 이 사주에 부족해서 채워 주면 좋은 오행). 전문 용어를 처음 접하는 독자도 이해할 수 있도록 최대한 친절하게 풀어 쓸 것.
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

function quarterLines(months: MonthScore[], from: number, to: number): string {
  return months.filter((m) => m.month >= from && m.month <= to)
    .map((m) => `- ${m.month}월 ${m.ganji} [${m.score}]: ${m.note}`).join("\n");
}

/** 세운·12개월 월운 데이터로 프리미엄 연운세 리포트 전문을 생성한다. */
export async function generateYearlyReport(yr: YearlyResult, year: number): Promise<string> {
  const monthLines = yr.months
    .map((m) => `- ${m.month}월 ${m.ganji} [${m.score}]: ${m.note}`)
    .join("\n");

  const baseFacts = `
대상 연도: ${year}년
세운(그 해 간지): ${yr.yearGanji} [종합 ${yr.yearScore}]
세운 특징: ${yr.yearNotes.join(" / ") || "특별한 합충 없음"}
현재 대운: ${yr.daewoon ? `${yr.daewoon.ganji} (${yr.daewoon.ageRange}, ${yr.daewoon.favorability})` : "정보 없음"}

[월별 흐름 전체 — 점수가 높을수록 순조로운 달]
${monthLines}`.trim();

  const quarters: [string, number, number][] = [
    ["1~3월", 1, 3], ["4~6월", 4, 6], ["7~9월", 7, 9], ["10~12월", 10, 12],
  ];

  const [overview, ...rest] = await Promise.all([
    // 1) 총운 + 분기 요약 — 월별 데이터 전체를 보고 큰 그림을 그린다
    callText(`당신은 명리학 대가입니다. 아래는 사주 엔진이 실제 세운(歲運)과 12개월 전체 월운(月運)을
계산한 데이터입니다. 이 데이터로 유료 프리미엄 ${year}년 연운세 리포트의 앞부분을 작성하세요.

${baseFacts}

다음 형식으로 정확히 작성하세요:

【 ${year}년 총운 】
(세운과 현재 대운을 근거로 올 한 해의 큰 흐름을 6~8문장으로. 상반기·하반기 흐름 차이, 이 해가 이 사람에게 갖는 의미, 대운과 세운이 겹치거나 부딪히는 지점까지 깊이 있게.)

【 분기별 흐름 요약 】
(1~3월, 4~6월, 7~9월, 10~12월 네 분기로 나누어 각 분기의 전체적인 기운과 대응 전략을 3~4문장씩.)
${COMMON_RULES}`, 2600),
    // 2~5) 분기별 월 상세 — 4개 병렬. 해당 분기 데이터만 넘겨 그 안에서만 서술하게 한다.
    ...quarters.map(([label, from, to]) =>
      callText(`당신은 명리학 대가입니다. 아래는 사주 엔진이 계산한 ${year}년 ${label} 월운(月運) 데이터입니다.
이 3개월 각각에 대해 프리미엄 연운세 리포트의 "월별 흐름" 문단 일부를 작성하세요.

세운(그 해 간지): ${yr.yearGanji}
[${label} 월별 흐름]
${quarterLines(yr.months, from, to)}

3개월 모두 빠짐없이 각각 최소 2~3문장으로 쓰세요 — 그 달 점수·근거가 무엇을 뜻하는지, 무엇을 하면 좋고 무엇을 조심할지. 점수가 특히 높거나 낮은 달은 4문장까지 늘려도 됩니다. "N월:"로 시작해 달마다 문단을 나누세요. 섹션 제목이나 다른 안내문 없이 이 3개월 본문만 작성하세요.
${COMMON_RULES}`, 1600)
    ),
    // 6) 재물·관계·조언 — 월별 데이터 전체를 다시 참조해 시기별로 구체적으로
    callText(`당신은 명리학 대가입니다. 아래는 사주 엔진이 실제 세운(歲運)과 12개월 전체 월운(月運)을
계산한 데이터입니다. 이 데이터로 유료 프리미엄 ${year}년 연운세 리포트의 뒷부분을 작성하세요.

${baseFacts}

다음 형식으로 정확히 작성하세요:

【 재물·직업운 】
(6~7문장. 어느 달에 재물운이 강한지·약한지 위 월별 데이터를 근거로 구체적으로 짚고, 이직·투자·지출처럼 실행 타이밍까지 조언.)

【 관계·건강운 】
(6~7문장. 특히 일지 충·해가 있는 달의 건강·이동·인간관계 주의를 반영하고, 좋은 달엔 어떤 관계 행동이 유리한지도.)

【 ${year}년 조언 】
(5~6문장. 한 해 전체를 관통하는 실용적 조언과, 특히 신경 써야 할 시기를 다시 한번 강조.)
${COMMON_RULES}`, 2800),
  ]);

  const [q1, q2, q3, q4, tail] = rest;
  return [
    overview,
    `【 월별 흐름 】\n${[q1, q2, q3, q4].join("\n")}`,
    tail,
  ].join("\n\n");
}
