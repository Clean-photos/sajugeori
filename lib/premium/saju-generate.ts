// 프리미엄 사주 풀이 8개 섹션 키 (프리미엄 페이지 SECTIONS와 일치)
const SECTION_KEYS = [
  "personality", "career", "money", "love",
  "health", "life_pattern", "current_phase", "yearly",
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];
type Report = Record<SectionKey, string>;

const elementGuide: Record<string, string> = {
  "木": "동쪽·숲·공원", "火": "남쪽·따뜻한 곳",
  "土": "중앙·내륙", "金": "서쪽·도시", "水": "북쪽·바다·강변",
};

// 8개 항목을 한 번에 요청하면(5800 토큰) compat-generate.ts에서 실측한 것과
// 같은 문제 — 실측 72.6초로 Vercel Hobby의 60초 상한을 넘겨 "풀이를 불러오지
// 못했습니다"로 실패한다(2026-08 확인). compat-generate.ts와 동일하게 앞/뒤
// 절반으로 나눠 병렬 2콜로 쪼갠다.
const COMMON_RULES = `
규칙:
- 반드시 데이터에 근거. 과장·미신적 단정 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지).
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 辛未(신미), 身弱(신약). 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
- 각 항목의 문자열 값 안에서 2~3문장마다 끊고 빈 줄(JSON 문자열 안에 "\\n\\n")로 나눌 것 — 한 문단에 4문장 이상을 몰아넣지 말 것.
- 일간·격·용신 등 사주 용어가 나오면 처음 언급하는 자리에서 괄호 안에 쉬운 현대식 설명을 짧게 덧붙일 것. 예: 무토(戊土, 넓고 든든한 산 같은 기운), 건록격(建祿格, 자기 힘으로 기반을 일구는 자수성가형 격), 용신(用神, 이 사주에 부족해서 채워 주면 좋은 오행). 전문 용어를 처음 접하는 독자도 이해할 수 있도록 최대한 친절하게 풀어 쓸 것.
- '엔진', 'AI', '알고리즘', '분석 시스템' 같은 표현은 절대 쓰지 말 것. 대신 "사주에 따르면", "명리학적으로 보면" 같은 자연스러운 표현을 쓸 것.
- JSON 외 다른 텍스트 없이 JSON만 응답.`;

/**
 * 스트리밍으로 호출해 JSON을 파싱한다. 비스트리밍 단일 요청은 응답이 오는 동안
 * 커넥션에 바이트가 전혀 안 흐르는 구간이 길어져 유휴 타임아웃에 걸리기 쉬운데,
 * 스트리밍은 토큰이 도착할 때마다 커넥션이 살아있다는 신호가 되어 이를 피한다.
 */
async function callJSON<T>(prompt: string, maxTokens: number, label: string): Promise<Partial<T>> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const started = Date.now();
  const stream = client.messages.stream({
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const res = await stream.finalMessage();
  console.log(`premium saju report [${label}] generated in ${Date.now() - started}ms, usage=${JSON.stringify(res.usage)}`);
  const textBlock = res.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`premium report [${label}]: JSON 없음. stop_reason=${res.stop_reason}`);
  }
  return JSON.parse(match[0]) as Partial<T>;
}

/**
 * saju_json(Layer B)으로 프리미엄 사주 8개 섹션 리포트를 생성한다.
 * birthDate("YYYY-MM-DD")를 주면 현재 나이와 현재 대운을 프롬프트에 명시한다 —
 * 없으면 LLM이 현재 대운을 추정하다 틀린다(2026-08 실측: 37세인데 45~54세 구간으로 서술).
 */
export async function generateReport(j: Record<string, unknown>, birthDate?: string): Promise<Report | null> {
  const identity = j.identity as Record<string, string> | undefined;
  const personality = j.personality as { strengths?: string[]; weaknesses?: string[] } | undefined;
  const elements = j.elements as Record<string, number> | undefined;
  const yongsinObj = j.yongsin as { eokbu?: string[]; johu?: string[]; climate?: string } | undefined;
  const luckCycles = (j.luck_cycles as Array<{ start_age: number; end_age: number; ganji: string; favorability: string }>) ?? [];
  const coreTags = (j.core_tags as Array<{ tag: string }>) ?? [];

  const yongsin = (yongsinObj?.eokbu?.length ? yongsinObj.eokbu : yongsinObj?.johu) ?? [];
  const kaiun = yongsin.map((e) => elementGuide[e] ?? e).join(", ");
  const fmtCycle = (c: { start_age: number; end_age: number; ganji: string; favorability: string }) =>
    `${c.start_age}~${c.end_age}세 ${c.ganji}(${c.favorability})`;
  // 초년 8개만 넘기면 현재·앞으로의 대운이 잘려 나가 LLM이 지어낸다. 전 구간을 준다.
  const allLuck = luckCycles.map(fmtCycle).join(", ");

  // 현재 나이·현재 대운은 엔진이 이미 정확히 계산해 둔 값(current_phase)을 그대로 쓴다.
  const currentAge = birthDate
    ? new Date().getFullYear() - parseInt(birthDate.slice(0, 4), 10)
    : null;
  const phase = j.current_phase as { age_range?: string } | undefined;
  const currentCycle =
    (currentAge !== null
      ? luckCycles.find((c) => currentAge >= c.start_age && currentAge <= c.end_age)
      : undefined) ??
    luckCycles.find((c) => `${c.start_age}-${c.end_age}` === phase?.age_range);
  const nextCycle = currentCycle
    ? luckCycles[luckCycles.indexOf(currentCycle) + 1]
    : undefined;

  const summary = `
일간: ${identity?.day_master ?? ""} / 강약: ${identity?.strength_label ?? ""}
핵심 설명: ${identity?.core_description ?? ""}
강점: ${personality?.strengths?.slice(0, 4).join(", ") ?? ""}
약점: ${personality?.weaknesses?.slice(0, 4).join(", ") ?? ""}
오행 분포: ${elements ? Object.entries(elements).map(([e, v]) => `${e}${v}`).join(" ") : ""}
용신: ${yongsin.join(", ")} / 개운 장소: ${kaiun || "없음"}
대운 흐름(전 구간): ${allLuck || "없음"}
핵심 태그: ${coreTags.map((t) => t.tag).join(", ")}
현재 연도: ${new Date().getFullYear()}년${currentAge !== null ? ` / 현재 나이: 만 ${currentAge}세` : ""}
현재 대운: ${currentCycle ? fmtCycle(currentCycle) : "정보 없음"}
다음 대운: ${nextCycle ? fmtCycle(nextCycle) : "정보 없음"}
  `.trim();

  const buildPrompt = (fields: string, extraRule = "") => `당신은 명리학 대가입니다. 아래 사주 데이터로 유료 프리미엄 사주 풀이의 일부를 작성하세요.
무료 버전보다 훨씬 깊고 구체적이어야 합니다.

${summary}

다음 항목을 JSON으로만 응답하세요. 각 값은 문자열이며, 항목당 4~6문장의 풍부한 풀이.

{
${fields}
}
${COMMON_RULES}${extraRule}`;

  try {
    // 2콜(항목 4개씩)로는 한 콜의 출력이 3000토큰에 육박해 40~50초가 걸렸고,
    // DB 왕복까지 더해지면 Vercel 60초 상한을 넘겨 생성이 통째로 실패했다
    // (2026-08-25 실측: 캐시가 살아난 뒤에도 계속 타임아웃). 항목 2개씩 4콜로
    // 쪼개 한 콜의 출력을 절반으로 줄인다 — 병렬이라 벽시계 시간은 가장 느린
    // 콜 하나에만 좌우되므로, 쪼갤수록 총 소요 시간이 짧아진다.
    const [p1, p2, p3, p4] = await Promise.all([
      callJSON<Report>(buildPrompt(
        `  "personality": "타고난 성격·기질. 일간과 강약, 핵심 태그 근거로 깊이 있게.",\n` +
        `  "career": "직업운. 어떤 분야·업무 스타일이 맞는지, 대운 흐름과 연결해 구체적으로."`
      ), 3600, "p1"),
      callJSON<Report>(buildPrompt(
        `  "money": "재물운. 재물을 모으는 방식, 주의할 시기, 오행 균형 관점.",\n` +
        `  "love": "연애·결혼운. 관계에서의 강점과 약점, 어떤 상대와 맞는지."`
      ), 3600, "p2"),
      callJSON<Report>(buildPrompt(
        `  "health": "건강. 오행 과부족 기반으로 주의할 신체 부위·습관.",\n` +
        `  "life_pattern": "인생에서 반복되는 패턴과 중요한 교훈."`
      ), 3600, "p3"),
      callJSON<Report>(buildPrompt(
        `  "current_phase": "현재 대운 시기의 의미와 앞으로 몇 년간의 흐름.",\n` +
        `  "yearly": "향후 3년(올해 포함) 연도별 핵심 운세를 연도별로."`,
        `\n- current_phase는 위 데이터의 '현재 대운'에 적힌 나이 구간·간지를 그대로 써야 한다. 임의로 다른 구간을 현재 대운이라고 쓰지 말 것. 다음 대운을 언급할 때도 '다음 대운' 값을 그대로 쓸 것.`
      ), 3600, "p4"),
    ]);
    const parsed = { ...p1, ...p2, ...p3, ...p4 };

    const report = {} as Report;
    for (const k of SECTION_KEYS) report[k] = parsed[k]?.trim() || "데이터가 부족해 이 항목은 준비 중입니다.";
    return report;
  } catch (e) {
    console.error("premium report error:", e);
    return null;
  }
}
