import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { runSajuEngine, checkSamjae } from "@/lib/saju-engine";
import { PHASE_MEANING } from "@/lib/saju-engine/samjae";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ad_token, extra } = body;

  if (!ad_token) return NextResponse.json({ error: "ad_token required" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid or used ad token" }, { status: 403 });

  const nowYear = new Date().getFullYear();
  let engineSummary = "";
  let samjaeSection = ""; // 삼재인 해에만 채워지고, 아니면 프롬프트에서 통째로 빠진다.
  try {
    const birthDate: string = extra?.birth_date ?? "1990-01-01";
    const result = runSajuEngine({
      birth_date: birthDate,
      birth_time: extra?.birth_time ?? null,
      calendar: "solar",
      gender: extra?.gender ?? "M",
    });
    const j = result.saju_json;

    const elementGuide: Record<string, string> = {
      "木": "숲·산·공원", "火": "따뜻한 남쪽",
      "土": "대지·내륙", "金": "도시·서쪽", "水": "바다·강변",
    };
    const yongsin = j.yongsin.eokbu.length > 0 ? j.yongsin.eokbu : j.yongsin.johu;
    const kaiun = yongsin.map((e: string) => elementGuide[e] ?? e).join(", ");

    // 현재 나이 계산 (실제 연도 기준 — 삼재 판정과도 동일 기준을 쓴다)
    const birthYear = parseInt(birthDate.slice(0, 4));
    const currentAge = nowYear - birthYear;

    // 현재 대운 사이클
    const currentCycle = j.luck_cycles.find(
      (c: { start_age: number; end_age: number }) => currentAge >= c.start_age && currentAge <= c.end_age
    );

    // 삼재 판정 (년지 + 현재 연도). 삼재는 띠로 보는 간이 신살이라 시각·성별 무관.
    const samjae = checkSamjae(j.pillars.year.branch, nowYear);
    const daewoonFavorable = !!currentCycle && /우호/.test(currentCycle.favorability);

    // 10대 이하 대운
    const earlyLuck = j.luck_cycles.filter((c: { end_age: number }) => c.end_age <= 19);
    const earlyLuckStr = earlyLuck
      .map((c: { start_age: number; end_age: number; ganji: string; favorability: string }) =>
        `${c.start_age}~${c.end_age}세 ${c.ganji}(${c.favorability})`)
      .join(", ") || "없음";

    engineSummary = `
일간: ${j.identity.day_master} (${j.identity.day_master_element}오행) / 강약: ${j.identity.strength_label}
핵심: ${j.identity.core_description}
강점: ${j.personality.strengths.slice(0, 3).join(", ")}
약점: ${j.personality.weaknesses.slice(0, 3).join(", ")}
오행: ${Object.entries(j.elements).map(([e, v]) => `${e}${v}`).join(" ")}
용신: ${yongsin.join(", ")} / 개운장소: ${kaiun || "없음"}
현재나이: ${currentAge}세 (${nowYear}년 기준)
현재대운: ${currentCycle ? `${currentCycle.start_age}~${currentCycle.end_age}세 ${currentCycle.ganji}(${currentCycle.favorability})` : "정보 없음"}
대운주의: ${j.current_phase.warnings.slice(0, 2).join(", ") || "없음"}
10대까지대운: ${earlyLuckStr}
삼재: ${samjae.isSamjae ? `${samjae.phase} (${samjae.years[0]}~${samjae.years[2]}년 삼재 중 ${nowYear}년은 ${nowYear - samjae.years[0] + 1}년차)` : "올해는 삼재 아님"}
    `.trim();

    // 삼재 여부는 결론(해당/미해당)과 단계를 반드시 문장으로 못 박게 한다.
    // 지시를 "설명하세요"로만 두면 모델이 배경 설명만 하고 사실 명시를 빠뜨린다.
    samjaeSection = samjae.isSamjae
      ? `

【 삼재 여부 】
첫 문장은 반드시 다음 사실을 그대로 밝히며 시작하세요: "${nowYear}년은 ${samjae.phase}에 해당합니다." 이어서 ${samjae.years[0]}년부터 ${samjae.years[2]}년까지 이어지는 삼재 가운데 ${nowYear - samjae.years[0] + 1}번째 해라는 점과, ${samjae.phase}가 ${PHASE_MEANING[samjae.phase!]}라는 뜻임을 밝히세요.
그다음 삼재는 태어난 해의 띠로 보는 3년 주기라, 사주팔자 전체나 대운과는 층위가 다른 참고 개념임을 1문장으로 덧붙이세요.
${daewoonFavorable
          ? `마지막으로 위 현재대운이 우호적이므로, 대운의 흐름이 받쳐 주어 삼재라도 크게 흔들리지 않고 무난히 지나갈 수 있다는 취지를 1문장 쓰세요.`
          : `마지막으로 삼재와 대운의 흐름이 겹쳐 조심스러운 시기이니 큰 변동·투자·보증은 신중히 하는 편이 좋다는 취지를 1문장 쓰세요.`}
겁을 주거나 불안을 조장하지 말고 담담하게 쓰세요. 전체 3~4문장.`
      : `

【 삼재 여부 】
첫 문장은 반드시 다음 사실을 그대로 밝히며 시작하세요: "${nowYear}년은 삼재에 해당하지 않습니다." 이어서 이 사주의 띠 기준으로 다음 삼재는 ${samjae.nextStartYear}년에 시작된다는 점을 밝히세요.
그다음 삼재는 태어난 해의 띠로 보는 3년 주기라, 사주팔자 전체나 대운과는 층위가 다른 참고 개념임을 1문장으로 덧붙이세요. 전체 2~3문장.`;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const prompt = `명리학 전문가로서 무료 사주 리포트를 작성하세요.

${engineSummary}

형식 (각 섹션 반드시 포함, 지시한 분량 엄수):

【 핵심 성격 】
일간·강약 근거로 3문장.

【 현재 운세 】
현재나이와 현재대운(ganji, favorability)을 반드시 언급. "현재 XX세, XX대운 시기로..." 형식으로 시작. ${nowYear}년 지금 이 시기의 운세를 3문장으로.
${samjaeSection}

【 개운 포인트 】
용신 오행 기반 개운 장소·방향 2가지. 2문장.

【 조언 】
강점 활용 + 약점 보완 실용 조언. 반드시 2문장만. 각 문장 40자 이내로 짧게.

【 대운 (大運) 】
• 10대까지: ${/* earlyLuckStr 직접 삽입 */""}10대 대운 특징 1문장.
• 이후 대운은 20대부터 본격적으로 펼쳐집니다. 현재 내 대운이 궁금하다면 AI 역술가와 직접 대화해보세요.

주의: 추측 없이 위 데이터에 근거해 작성(나이·오행·대운 등 위에 없는 정보 임의 생성 금지). '삼재 여부' 섹션은 지시된 첫 문장을 절대 생략하지 말고 그대로 밝힐 것 — 해당 여부와 단계를 독자가 바로 알 수 있어야 한다. 한국어. 과장 금지. 지시한 문장 수 초과 금지. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
한자 표기 규칙: 한자 뒤에 반드시 한글 독음 괄호 표기. 예: 庚(경), 辛未(신미). 한자 단독 사용 절대 금지.
이미 한글로만 쓰인 단어(예: 신약, 극신약, 신강)에는 괄호로 같은 한글을 또 붙이지 말 것 — 한자를 병기할 때만 괄호를 쓴다.`;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const aiStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1100,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(enc.encode("분석 중 오류가 발생했습니다. 다시 시도해주세요."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
