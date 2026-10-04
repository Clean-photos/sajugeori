import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { kstNow } from "@/lib/time/kst";
import { parseFree, BAD_INPUT, freeTaekilSchema } from "@/lib/free/validate";
import { freeCapReached, recordFreeLlm } from "@/lib/security/rate-limit";
import { runSajuEngine, buildChart, rankDates } from "@/lib/saju-engine";
import type { TaekilPurpose } from "@/lib/saju-engine";
import { wrapStreamError } from "@/lib/report-stream-error";

const PURPOSE_LABEL: Record<string, string> = {
  wedding: "결혼식", move: "이사", business: "개업·계약",
  travel: "여행·출발", surgery: "수술·시술", other: "기타",
};

export async function POST(req: NextRequest) {
  const parsed = parseFree(freeTaekilSchema, await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json(BAD_INPUT, { status: 400 });
  const { birth_date, gender, purpose, range_from, range_to, ad_token } = parsed.data;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  // 무료 AI 하루 전체 상한(비용 안전장치, 2026-10-04) — 토큰을 소비하기 전에 확인한다.
  if (await freeCapReached()) {
    return NextResponse.json({ error: "오늘 무료 이용량이 모두 소진되었어요. 내일 다시 이용해 주세요." }, { status: 429 });
  }
  const valid = await getAdRewardProvider().verify(ad_token, ip);
  if (!valid) return NextResponse.json({ error: "Invalid ad token" }, { status: 403 });
  await recordFreeLlm();

  let engineSummary = "";
  try {
    const birthDate: string = birth_date ?? "1990-01-01";
    const genderVal: "M" | "F" = gender ?? "M";
    const result = runSajuEngine({ birth_date: birthDate, birth_time: null, calendar: "solar", gender: genderVal });
    const j = result.saju_json;
    const yongsin = j.yongsin.eokbu.length > 0 ? j.yongsin.eokbu : j.yongsin.johu;

    // §1(CoS 실물 확인, 2026-09-30): 이 라우트가 실제 일진을 하나도 계산하지 않고
    // 모델에게 "구체적인 날짜를 제시하라"고만 시켜, 날짜·간지를 모델이 그대로
    // 지어냈다(5개 중 4개 오류, 그중 하나는 기신과 합을 이루는 날을 좋은 날로
    // 추천). 프리미엄 택일과 같은 엔진(rankDates)으로 실제 일진을 계산해 넘기고,
    // 모델은 그 날짜에 대한 설명만 쓰게 한다 — 날짜·간지 자체는 모델이 못 짓는다.
    const from: string = typeof range_from === "string" && range_from ? range_from : kstNow().toISOString().slice(0, 10);
    const to: string = typeof range_to === "string" && range_to ? range_to : kstNow(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const chart = buildChart(`${birthDate}T00:00:00`, genderVal, false);
    const ranked = rankDates(chart, from, to, (purpose as TaekilPurpose) ?? "other");
    const bestLines = ranked.best.slice(0, 3)
      .map((d) => `- ${d.date} (${d.weekday}) ${d.ganji}: ${d.notes.join("; ")}`)
      .join("\n") || "- 조건에 맞는 좋은 날을 찾지 못함";

    engineSummary = `
목적: ${PURPOSE_LABEL[purpose] ?? purpose}
조회 기간: ${from} ~ ${to}
일간: ${j.identity.day_master} / 강약: ${j.identity.strength_label}
용신 오행: ${yongsin.join(", ")}
기후 용신: ${j.yongsin.climate}
현재 대운 흐름: ${j.current_phase.theme}
대운 주의: ${j.current_phase.warnings.join(", ") || "없음"}
오행 분포: ${Object.entries(j.elements).map(([e, v]) => `${e}${v}`).join(" ")}

[실제 계산한 추천일 — 이 날짜와 간지만 쓸 것]
${bestLines}
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
(위 "[실제 계산한 추천일]" 목록에 있는 날짜만 그대로 사용해 각 날짜마다 한 줄 이유를 쓸 것.
형식: "YYYY-MM-DD (요일) — 이유". 목록에 없는 날짜를 새로 만들거나 간지를 바꿔 쓰지 말 것.)

추측 없이 위 데이터에 근거해 작성(위에 없는 날짜·오행 정보 임의 생성 금지). 한국어로. 과장 금지. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
한자 표기 규칙: 한자 뒤에 반드시 한글 독음 괄호 표기. 예: 庚(경), 辛未(신미). 한자 단독 사용 절대 금지.
이미 한글로만 쓰인 단어(예: 신약, 극신약, 신강)에는 괄호로 같은 한글을 또 붙이지 말 것 — 한자를 병기할 때만 괄호를 쓴다.
오행 이름은 "土(토)"처럼 한자(한글) 형태 또는 한글만 쓰고, "토(토)"·"수(수)"처럼 같은 한글을 괄호에 반복하거나 "토지(土)"처럼 다른 뜻의 말로 바꿔 쓰지 말 것.`;

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
        controller.enqueue(enc.encode(wrapStreamError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
