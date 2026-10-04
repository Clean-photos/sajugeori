import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { kstYear } from "@/lib/time/kst";
import { scoreYear, yearDirection } from "@/lib/saju-engine";
import { parseFree, BAD_INPUT, freeYearlySchema } from "@/lib/free/validate";
import { freeCapReached, recordFreeLlm } from "@/lib/security/rate-limit";
import { runSajuEngine } from "@/lib/saju-engine";
import { wrapStreamError } from "@/lib/report-stream-error";

export async function POST(req: NextRequest) {
  const parsed = parseFree(freeYearlySchema, await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json(BAD_INPUT, { status: 400 });
  const { birth_date, gender, year, ad_token } = parsed.data;

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
    const result = runSajuEngine({ birth_date: birth_date ?? "1990-01-01", birth_time: null, calendar: "solar", gender: gender ?? "M" });
    const j = result.saju_json;
    const targetYear = year ?? kstYear();
    const birthYear = parseInt((birth_date ?? "1990-01-01").slice(0, 4));
    const age = targetYear - birthYear;

    const cycle = j.luck_cycles.find(
      (c: { start_age: number; end_age: number }) => age >= c.start_age && age <= c.end_age
    );
    const yongsin = j.yongsin.eokbu.length > 0 ? j.yongsin.eokbu : j.yongsin.johu;

    // §A-6(CoS 9차, 2026-10-02): 모델이 오행 개수를 보고 스스로 "木 과다"라고 서술해
    // (실제 분포는 火3·木2) 엔진 데이터와 어긋났다. 과다·부족 판정을 엔진이 미리
    // 내려 주고, 모델은 그 판정만 쓰게 한다 — 분포 숫자만 주고 판단을 맡기지 않는다.
    const elementEntries = Object.entries(j.elements) as [string, number][];
    const maxCount = Math.max(...elementEntries.map(([, v]) => v));
    const strongest = elementEntries.filter(([, v]) => v === maxCount && v > 0).map(([e, v]) => `${e}${v}`);
    const absent = elementEntries.filter(([, v]) => v === 0).map(([e]) => e);
    // 2026-10-04(CoS 10차 §3): 무료 연운세가 대운만 보고 그해 간지(세운)를 전혀 반영하지 않아
    // 2026·2027년이 같은 내용으로 나오고 프리미엄 판정과도 갈렸다. 프리미엄과 같은 세운 엔진·같은
    // 방향 판정을 써서 그해 간지·합충·방향을 넣는다(월별만 생략).
    const seun = scoreYear(result.saju_raw, targetYear);
    const seunDirection = yearDirection(seun.yearScore);
    const elementVerdict = `가장 많은 오행: ${strongest.join(", ")} / 없는 오행: ${absent.length ? absent.join(", ") : "없음"}`;

    engineSummary = `
조회 연도: ${targetYear}년 (${age}세)
일간: ${j.identity.day_master} / 강약: ${j.identity.strength_label}
핵심 설명: ${j.identity.core_description}
용신: ${yongsin.join(", ")}
세운(그해 간지): ${targetYear}년 ${seun.yearGanji}
세운 특징: ${seun.yearNotes.join(" / ") || "특별한 합충 없음"}
연간 방향(판정): ${seunDirection.label}
현재 대운: ${cycle ? `${cycle.ganji} (${cycle.start_age}~${cycle.end_age}세, ${cycle.favorability})` : "정보 없음"}
대운 기회: ${j.current_phase.opportunities.join(", ") || "없음"}
대운 주의: ${j.current_phase.warnings.join(", ") || "없음"}
강점: ${j.personality.strengths.slice(0, 3).join(", ")}
약점: ${j.personality.weaknesses.slice(0, 3).join(", ")}
직업 위험요인: ${j.career.risk_factors.slice(0, 2).join(", ") || "없음"}
오행 분포: ${elementEntries.map(([e, v]) => `${e}${v}`).join(" ")}
오행 판정(엔진 계산): ${elementVerdict}
    `.trim();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const prompt = `당신은 명리학 전문가입니다. 아래 사주 데이터로 ${year}년 연운세 리포트를 작성하세요.

${engineSummary}

다음 형식으로 작성하세요:

【 ${year}년 총운 】
3문장. 첫 문장은 반드시 ${year}년의 간지(위 "세운")를 밝히고 위 "연간 방향(판정)"과 같은 방향으로 시작할 것(유리/부담/무난을 바꾸지 말 것). 이어서 세운 특징과 현재 대운이 어떻게 겹치는지 설명.

【 직업·재물운 】
2문장. 핵심 흐름과 주의점.

【 연애·관계운 】
2문장. 강점과 주의점 각 1문장.

【 건강·생활운 】
1~2문장. 오행 과부족 기반.

【 ${year}년 조언 】
2문장. 40자 이내로 짧게.

오행이 "많다·강하다·과다"라고 쓸 수 있는 것은 위 "오행 판정"의 "가장 많은 오행"뿐이고, "없다·부족하다"라고 쓸 수 있는 것은 "없는 오행"뿐입니다. 분포 숫자를 직접 해석해 다른 오행을 과다·부족이라 쓰지 마세요.
추측 없이 위 데이터에 근거해 작성(위에 없는 정보 임의 생성 금지). 한국어로. 과장 금지. 마크다운 절대 금지(#, ##, **, *, @, >, - 기호 사용 금지). 섹션 제목은 【 】 형식만 사용.
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
          max_tokens: 800,
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
