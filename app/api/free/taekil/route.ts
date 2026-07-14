import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { runSajuEngine } from "@/lib/saju-engine";

const PURPOSE_LABEL: Record<string, string> = {
  wedding: "결혼식", move: "이사", business: "개업·계약",
  travel: "여행·출발", surgery: "수술·시술", other: "기타",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { birth_date, gender, purpose, range_from, range_to, ad_token } = body;

  if (!ad_token) return NextResponse.json({ error: "ad_token required" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid ad token" }, { status: 403 });

  let engineSummary = "";
  try {
    const result = runSajuEngine({ birth_date: birth_date ?? "1990-01-01", birth_time: null, calendar: "solar", gender: gender ?? "M" });
    const j = result.saju_json;
    const yongsin = j.yongsin.eokbu.length > 0 ? j.yongsin.eokbu : j.yongsin.johu;

    engineSummary = `
목적: ${PURPOSE_LABEL[purpose] ?? purpose}
조회 기간: ${range_from ?? "오늘"} ~ ${range_to ?? "3개월 후"}
일간: ${j.identity.day_master} / 강약: ${j.identity.strength_label}
용신 오행: ${yongsin.join(", ")}
기후 용신: ${j.yongsin.climate}
현재 대운 흐름: ${j.current_phase.theme}
대운 주의: ${j.current_phase.warnings.join(", ") || "없음"}
오행 분포: ${Object.entries(j.elements).map(([e, v]) => `${e}${v}`).join(" ")}
    `.trim();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const prompt = `당신은 명리학 택일 전문가입니다. 아래 사주 데이터로 택일 리포트를 작성하세요.

${engineSummary}

다음 형식으로 작성하세요:

【 택일 기준 】
(이 사람의 용신 오행과 현재 대운을 근거로 어떤 날이 좋은지 원칙 2~3문장.)

【 추천 날짜 및 이유 】
(조회 기간 내에서 구체적인 날짜 3~5개를 추천. 각 날짜마다 한 줄 이유. 형식: "YYYY-MM-DD (요일) — 이유"
날짜는 용신 오행의 천간지지 기운이 강한 날 위주로. 실제 날짜를 구체적으로 제시할 것.)

추측 없이 위 데이터에 근거해 작성(위에 없는 날짜·오행 정보 임의 생성 금지). 한국어로. 과장 금지. 날짜는 반드시 구체적으로 제시. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
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
          max_tokens: 900,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(enc.encode("분석 중 오류가 발생했습니다."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
