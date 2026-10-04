import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { parseFree, BAD_INPUT, freeCompatSchema } from "@/lib/free/validate";
import { freeCapReached, recordFreeLlm } from "@/lib/security/rate-limit";
import { buildChart } from "@/lib/saju-engine";
import { mutualAnalysis } from "@/lib/saju-engine";
import { wrapStreamError } from "@/lib/report-stream-error";

export async function POST(req: NextRequest) {
  const parsed = parseFree(freeCompatSchema, await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json(BAD_INPUT, { status: 400 });
  const { my_birth, my_gender, other_birth, other_gender, context, ad_token } = parsed.data;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  // 무료 AI 하루 전체 상한(비용 안전장치, 2026-10-04) — 토큰을 소비하기 전에 확인한다.
  if (await freeCapReached()) {
    return NextResponse.json({ error: "오늘 무료 이용량이 모두 소진되었어요. 내일 다시 이용해 주세요." }, { status: 429 });
  }
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid ad token" }, { status: 403 });
  await recordFreeLlm();

  const contextLabel: Record<string, string> = { romance: "연애·결혼", work: "직장·비즈니스", friend: "친구·지인" };

  let engineData = "";
  let normalizedScore = 50;

  try {
    const myIso = `${my_birth}T00:00:00`;
    const otherIso = `${other_birth}T00:00:00`;
    const meChart = buildChart(myIso, my_gender ?? "M", false);
    const otherChart = buildChart(otherIso, other_gender ?? "F", false);
    // 2026-10-04(CoS 10차 §4): 한 방향(입력한 사람 기준)만 보면 같은 커플이 나·상대를 바꿔 입력할 때
    // 42/39로 갈렸다. 프리미엄과 같은 양방향 함수(mutualAnalysis)로 계산하고 시주만 제외한다.
    const mutual = mutualAnalysis(meChart, otherChart, "나", "상대", context ?? "romance");

    normalizedScore = Math.min(100, Math.max(0, Math.round(38 + mutual.combinedScore * 6)));
    const notes = [...new Set([...mutual.partnerToMe.notes, ...mutual.meToPartner.notes])];
    engineData = `궁합 점수: ${normalizedScore}/100\n분석 포인트:\n${notes.map((n) => `- ${n}`).join("\n")}`;
  } catch {
    engineData = "계산 데이터 없음 — 일반적인 사주 궁합 이론으로 분석";
  }

  const prompt = `당신은 명리학 전문가입니다. 아래 사주 궁합 분석 데이터를 바탕으로 궁합 리포트를 작성하세요.

컨텍스트: ${contextLabel[context] ?? context}
${engineData}

다음 형식으로 정확히 작성하세요 (각 섹션 타이틀 포함):

【 궁합 점수 】 ${normalizedScore}점 / 100점
(점수 바로 아래에 다음 한 줄을 그대로 쓸 것: 태어난 시각은 반영하지 않은 점수이며, 시각을 넣으면 달라질 수 있습니다.)

【 잘 맞는 부분 】
• (첫 번째 장점 — 구체적으로 2줄 이내)
• (두 번째 장점 — 구체적으로 2줄 이내)
• (세 번째 장점 — 구체적으로 2줄 이내)

【 주의할 부분 】
• (첫 번째 주의사항 — 구체적으로 2줄 이내)
• (두 번째 주의사항 — 구체적으로 2줄 이내)
• (세 번째 주의사항 — 구체적으로 2줄 이내)

【 두 사람의 관계를 위한 팁 】
• (실용적인 조언 1)
• (실용적인 조언 2)
• (실용적인 조언 3)

【 한줄 요약 】
(두 사람의 전체적인 궁합을 60자 이내 한 문장으로. 결혼/연애/우정에 대한 현실적인 결론으로 끝낼 것. 예: "오행 보완이 뛰어나 서로 채워주는 관계라 결혼까지도 무난합니다." / "초반 끌림은 강하나 마찰이 잦아 짧은 연애가 더 나을 수 있습니다." — 반드시 마침표로 끝낼 것.)

주의: 추측 없이 위 데이터에 근거해 작성. 과장 금지. 한국어로. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
'엔진', 'AI', '알고리즘', '분석 시스템', '데이터베이스' 같은 표현은 절대 쓰지 말 것. 대신 "사주에 따르면", "명리학적으로 보면" 같은 자연스러운 표현을 쓸 것.
한자 표기 규칙: 한자 뒤에 반드시 한글 독음 괄호 표기. 예: 庚(경), 辛未(신미). 한자 단독 사용 절대 금지.
이미 한글로만 쓰인 단어(예: 신약, 극신약, 신강)에는 괄호로 같은 한글을 또 붙이지 말 것 — 한자를 병기할 때만 괄호를 쓴다.
오행 이름은 "土(토)"처럼 한자(한글) 형태 또는 한글만 쓰고, "토(토)"·"수(수)"처럼 같은 한글을 괄호에 반복하거나 "토지(土)"처럼 다른 뜻의 말로 바꿔 쓰지 말 것.
위 "분석 포인트"에 이미 木(목)·火(화)처럼 한자(한글)이 병기된 오행은 그 표기를 그대로 옮겨 쓸 것 — 한글만 다시 괄호로 감싸(예: 토(토)) 쓰지 말 것.
나이 차이(연상·연하 등)는 이 분석의 근거가 아니므로 절대 언급하지 말 것.`;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const aiStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1400,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(enc.encode(wrapStreamError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
