import type { petCompatibility, PET_BRANCH_HINT, PET_FLOW_HINT } from "@/lib/saju-engine";

// 단일 호출(7500토큰)로 실측 79.6초가 나와 Vercel Hobby의 60초 상한을 넘긴다
// (2026-08-11 실측). compat/salpuri/taekil과 같은 이유로 병렬 2콜로 쪼갠다.
// 앞부분(아이의 사주·집사님의 사주·둘의 케미)과 뒷부분(속마음·함께하면
// 좋은 것·행복 팁)으로 나눈다.

type Facts = ReturnType<typeof petCompatibility>;

const COMMON_RULES = `
규칙:
- 반드시 위 엔진 데이터에 근거. 없는 사실(구체적 사건·수명·질병·품종 등) 지어내기 금지.
- 반려동물 궁합이므로 부정적 판정·경고·불안 조장 절대 금지. 충·해가 있어도 사랑스러운 긍정으로 풀 것.
- 겁주기, 부적·굿 등 금전 지출 암시 금지.
- 따뜻하고 다정한 존댓말. 이모지 사용 금지.
- 동물행동학 근거를 언급할 때는 '연구에 따르면' 정도로 담백하게 쓰고, 논문명이나 수치를 지어내지 마세요.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 壬寅(임인). 이미 한글로만 쓰인 단어에 같은 한글을 괄호로 또 붙이지 말 것.`;

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

function buildEngineSummary(
  facts: Facts, petName: string,
  branchHint: typeof PET_BRANCH_HINT, flowHint: typeof PET_FLOW_HINT
): string {
  const sp = facts.speciesInfo;
  return `
[반려동물]
이름: ${petName} (${sp.label})
띠: ${facts.pet.zodiac}띠 / 년주 ${facts.pet.yearGanji} / 대표 오행 ${facts.pet.element}
${facts.pet.hasDay ? `일주까지 세움: ${facts.pet.dayGanji}` : "태어난 날은 몰라 띠·월 기준으로 봄"}

[${sp.label}의 행동 심리 — 동물행동학 연구로 확인된 사실. 사주 해석에 이 결을 반드시 얹을 것]
${sp.traits.map((t) => `· ${t}`).join("\n")}
${sp.label}가 애정을 드러내는 방식: ${sp.loveSigns.join(", ")}

[주인]
일간 ${facts.owner.dayMaster} (오행 ${facts.owner.element}) / ${facts.owner.strength}

[둘의 관계 — 아래 힌트에 근거해 서술할 것]
띠 관계: ${branchHint[facts.relation.branch]}
오행 흐름(아이의 속마음): ${flowHint[facts.relation.flow]}
${facts.relation.yongsinFill.length
    ? `기운 보완: 아이가 주인에게 필요한 오행(${facts.relation.yongsinFill.join("·")})을 더해 주어, 곁에 있으면 주인의 기운이 살아납니다.`
    : "기운 보완: 특별히 도드라지는 오행 보완은 없지만, 서로의 리듬을 편안히 맞춰 갑니다."}

[함께하면 좋은 것 — 아래 값만 사용할 것]
집사님에게 필요한 기운: ${facts.lifestyle.ownerElement}
  · 장소: ${facts.lifestyle.owner.place}
  · 활동: ${facts.lifestyle.owner.activity}
  · 색: ${facts.lifestyle.owner.color}
  · 방향: ${facts.lifestyle.owner.direction}
${petName}의 타고난 기운: ${facts.lifestyle.petElement}
  · 장소: ${facts.lifestyle.pet.place}
  · 활동: ${facts.lifestyle.pet.activity}
  · 색: ${facts.lifestyle.pet.color}
  · 방향: ${facts.lifestyle.pet.direction}
${facts.lifestyle.shared
    ? "→ 두 사람에게 좋은 기운이 같습니다. 같은 장소·활동·색이 둘 모두에게 이롭다는 점을 강조할 것."
    : "→ 두 사람의 기운이 다릅니다. 두 가지를 번갈아 누리거나, 시밀러룩처럼 두 색을 함께 쓰는 방식을 제안할 것."}`.trim();
}

/** 반려동물 궁합 데이터로 프리미엄 리포트 전문을 생성한다. */
export async function generatePetReport(
  facts: Facts, petName: string,
  branchHint: typeof PET_BRANCH_HINT, flowHint: typeof PET_FLOW_HINT
): Promise<string> {
  const sp = facts.speciesInfo;
  const engineSummary = buildEngineSummary(facts, petName, branchHint, flowHint);
  const otherSpeciesNote = facts.species === "cat"
    ? "산책 줄을 매고 함께 걷기, 현관에서 꼬리 흔들며 반기기 등"
    : "캣타워에 오르기, 골골 소리 내기 등";
  const loveSignNote = facts.species === "cat"
    ? "슬로우 블링크, 머리를 비비는 것, 곁에서 골골거리는 것처럼 고양이 특유의 신호로 표현하세요."
    : "낯선 것을 만났을 때 집사님을 돌아보는 것, 발치에 붙어 앉는 것처럼 강아지 특유의 신호로 표현하세요.";
  const togetherNote = facts.species === "cat"
    ? "고양이는 영역 동물이라 바깥 나들이보다 집 안 환경을 그 기운에 맞게 꾸미는 쪽으로 제안하세요. 자리 배치, 창가나 높은 곳, 물그릇 위치처럼 실내에서 할 수 있는 것으로 쓰고, 산책이나 나들이는 권하지 마세요. 색은 방석·담요·캣타워 같은 물건과 집사님 옷을 맞추는 식으로 제안하세요."
    : "산책 코스와 나들이 장소를 중심으로 제안하세요. 색은 시밀러룩(집사님 옷과 아이의 하네스·목줄·산책 가방 등)으로 맞추면 좋다는 식으로 실용적으로 쓰세요.";

  const [front, back] = await Promise.all([
    callText(`당신은 따뜻한 명리학 상담가입니다. 아래는 사주 엔진이 계산한 '반려동물과 주인의 궁합' 데이터입니다.
이 데이터에 근거해, 반려동물을 사랑하는 주인이 읽고 흐뭇하고 감동할 유료 프리미엄 궁합 리포트의
앞부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히 달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 우리 ${petName}의 사주 】
아이의 띠와 년주, 타고난 오행을 근거로 어떤 성정을 지녔는지 6~7문장으로. 평소 어떤 모습을 보일지(좋아하는 것, 반응하는 방식, 표정과 몸짓), 낯선 상황이나 사람을 만났을 때의 태도까지 구체적으로 그려 주세요. 일주까지 세운 경우 그 결도 함께 짚어 주세요.
반드시 ${sp.label}다운 장면으로 묘사하세요. 위 '${sp.label}의 행동 심리'에 나온 습성과 애정 표현 방식을 사주의 기운과 엮어 서술하고, 다른 종의 행동(${otherSpeciesNote})은 쓰지 마세요.

【 집사님의 사주 】
주인의 일간·오행·강약을 근거로 8~10문장의 충실한 분석을 쓰세요. 타고난 기질과 성향, 사람을 대하는 방식, 어떤 상황에서 힘을 얻고 어떤 상황에서 지치는지, 신강·신약이 일상에서 어떻게 드러나는지를 차근차근 풀어 주세요. 그리고 그런 집사님이 왜 반려동물과 함께 사는 삶에 잘 어울리는지, 아이를 어떤 방식으로 사랑하는 사람인지까지 이어서 서술해 주세요.

【 둘의 케미 】
위 '띠 관계'와 '기운 보완' 힌트에 근거해 8~10문장으로 깊이 있게 쓰세요. 두 사람의 기운이 어떻게 맞물리는지 원리를 먼저 설명하고, 그것이 일상에서 어떤 장면으로 나타나는지(함께 있을 때의 공기, 집사님이 힘들 때 아이가 보이는 반응, 아이가 신났을 때 집사님이 느끼는 것 등) 구체적으로 그려 주세요. 이 만남이 왜 서로에게 좋은 인연인지, 시간이 흐를수록 어떤 관계로 깊어질지도 함께 짚어 주세요.
${COMMON_RULES}
- 아이를 '${petName}'로 부를 것.
- ${petName}는 ${sp.label}입니다. ${sp.label}의 실제 습성에 맞는 장면만 쓰고, 다른 종의 행동을 섞지 마세요.`, 3800),

    callText(`당신은 따뜻한 명리학 상담가입니다. 아래는 사주 엔진이 계산한 '반려동물과 주인의 궁합' 데이터입니다.
이 데이터에 근거해, 반려동물을 사랑하는 주인이 읽고 흐뭇하고 감동할 유료 프리미엄 궁합 리포트의
뒷부분을 작성하세요. 990원짜리 무료 버전과는 분량·깊이가 확연히 달라야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 ${petName}의 속마음 】
위 '오행 흐름(아이의 속마음)' 힌트를 반드시 반영해 5~6문장으로.
반드시 3인칭 관찰 서술로 쓰세요. "${petName}는 집사님을 ~한 존재로 생각하고 있습니다", "아마 ~라고 말하고 싶을 거예요", "${petName}의 마음속에는 ~한 감정이 자리하고 있을 것입니다" 같은 담담한 문체를 쓰세요.
아이가 1인칭으로 직접 말하는 대사체("집사님, 저는요…")는 절대 쓰지 마세요. 낯간지러운 표현이나 과한 감정 과잉 없이, 담백하게 서술하되 읽고 나면 마음이 뭉클해지도록 쓰세요.
또한 위 '${sp.label}의 행동 심리'를 근거로, ${petName}가 그 마음을 실제로 어떤 행동으로 드러내는지 한두 장면을 구체적으로 넣어 주세요. ${loveSignNote} 연구로 확인된 사실이라는 점을 자연스럽게 곁들이면 더 좋습니다.

【 함께하면 좋은 것 】
위 '함께하면 좋은 것' 데이터만 사용해 5~6문장으로 쓰세요. 어떤 공간이 좋은지, 어떤 활동이 둘 모두의 기운을 살리는지, 좋은 방향은 어느 쪽인지 구체적으로 안내해 주세요.
${togetherNote}
데이터에 없는 장소·색·방향을 지어내지 마세요.

【 더 행복해지는 팁 】
둘의 관계를 더 좋게 하는 소소하고 실용적인 제안 3가지를 4~5문장으로. 위 사주 분석과 자연스럽게 이어지도록 쓰세요.
${COMMON_RULES}
- 아이를 '${petName}'로 부를 것.
- ${petName}는 ${sp.label}입니다. ${sp.label}의 실제 습성에 맞는 장면만 쓰고, 다른 종의 행동을 섞지 마세요.`, 3800),
  ]);

  return [front, back].join("\n\n");
}
