import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { buildChart } from "@/lib/saju-engine";
import { pairAnalysis } from "@/lib/saju-engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { my_birth, my_gender, other_birth, other_gender, context, ad_token } = body;

  if (!ad_token) return NextResponse.json({ error: "ad_token required" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid ad token" }, { status: 403 });

  const contextLabel: Record<string, string> = { romance: "연애·결혼", work: "직장·비즈니스", friend: "친구·지인" };

  let engineData = "";
  let normalizedScore = 50;

  try {
    const myIso = `${my_birth}T00:00:00`;
    const otherIso = `${other_birth}T00:00:00`;
    const meChart = buildChart(myIso, my_gender ?? "M", false);
    const otherChart = buildChart(otherIso, other_gender ?? "F", false);
    const pair = pairAnalysis(meChart, otherChart, "나", "상대", context ?? "romance");

    normalizedScore = Math.min(100, Math.max(0, Math.round(38 + pair.score * 6)));
    engineData = `궁합 점수: ${normalizedScore}/100\n분석 포인트:\n${pair.notes.map((n) => `- ${n}`).join("\n")}`;
  } catch {
    engineData = "엔진 데이터 없음 — 일반적인 사주 궁합 이론으로 분석";
  }

  const prompt = `당신은 명리학 전문가입니다. 아래 사주 궁합 엔진 분석 데이터를 바탕으로 궁합 리포트를 작성하세요.

컨텍스트: ${contextLabel[context] ?? context}
${engineData}

다음 형식으로 정확히 작성하세요 (각 섹션 타이틀 포함):

【 궁합 점수 】 ${normalizedScore}점 / 100점

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

주의: 추측 없이 엔진 데이터에 근거해 작성. 과장 금지. 한국어로. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
한자 표기 규칙: 한자 뒤에 반드시 한글 독음 괄호 표기. 예: 庚(경), 辛未(신미). 한자 단독 사용 절대 금지.`;

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
        controller.enqueue(enc.encode("분석 중 오류가 발생했습니다. 다시 시도해주세요."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
