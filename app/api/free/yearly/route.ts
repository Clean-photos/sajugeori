import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { runSajuEngine } from "@/lib/saju-engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { birth_date, gender, year, ad_token } = body;

  if (!ad_token) return NextResponse.json({ error: "ad_token required" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid ad token" }, { status: 403 });

  let engineSummary = "";
  try {
    const result = runSajuEngine({ birth_date: birth_date ?? "1990-01-01", birth_time: null, calendar: "solar", gender: gender ?? "M" });
    const j = result.saju_json;
    const targetYear = parseInt(year ?? new Date().getFullYear());
    const birthYear = parseInt((birth_date ?? "1990-01-01").slice(0, 4));
    const age = targetYear - birthYear;

    const cycle = j.luck_cycles.find(
      (c: { start_age: number; end_age: number }) => age >= c.start_age && age <= c.end_age
    );
    const yongsin = j.yongsin.eokbu.length > 0 ? j.yongsin.eokbu : j.yongsin.johu;

    engineSummary = `
조회 연도: ${targetYear}년 (${age}세)
일간: ${j.identity.day_master} / 강약: ${j.identity.strength_label}
핵심 설명: ${j.identity.core_description}
용신: ${yongsin.join(", ")}
현재 대운: ${cycle ? `${cycle.ganji} (${cycle.start_age}~${cycle.end_age}세, ${cycle.favorability})` : "정보 없음"}
대운 기회: ${j.current_phase.opportunities.join(", ") || "없음"}
대운 주의: ${j.current_phase.warnings.join(", ") || "없음"}
강점: ${j.personality.strengths.slice(0, 3).join(", ")}
약점: ${j.personality.weaknesses.slice(0, 3).join(", ")}
직업 위험요인: ${j.career.risk_factors.slice(0, 2).join(", ") || "없음"}
오행 분포: ${Object.entries(j.elements).map(([e, v]) => `${e}${v}`).join(" ")}
    `.trim();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const prompt = `당신은 명리학 전문가입니다. 아래 사주 데이터로 ${year}년 연운세 리포트를 작성하세요.

${engineSummary}

다음 형식으로 작성하세요:

【 ${year}년 총운 】
2문장. 대운 유불리 명확히.

【 직업·재물운 】
2문장. 핵심 흐름과 주의점.

【 연애·관계운 】
2문장. 강점과 주의점 각 1문장.

【 건강·생활운 】
1~2문장. 오행 과부족 기반.

【 ${year}년 조언 】
2문장. 40자 이내로 짧게.

추측 없이 위 데이터에 근거해 작성(위에 없는 정보 임의 생성 금지). 한국어로. 과장 금지. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
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
          max_tokens: 800,
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
