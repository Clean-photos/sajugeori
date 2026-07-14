import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser } from "@/lib/billing/access";
import { buildChart, rankDates } from "@/lib/saju-engine";
import type { TaekilPurpose } from "@/lib/saju-engine";

// 택일 리포트 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향
export const maxDuration = 60;

const PURPOSE_LABEL: Record<string, string> = {
  wedding: "결혼식", move: "이사", business: "개업·계약",
  travel: "여행·출발", surgery: "수술·시술", other: "기타",
};

// POST /api/premium/taekil — 로그인+프리미엄 필수. 등록된 내 사주 + 일진 실계산으로 택일.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/taekil" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await isPremiumUser(userId))) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/subscribe" }, { status: 402 });
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  const body = await req.json();
  const purpose = (body.purpose ?? "other") as TaekilPurpose;
  const from = body.range_from as string;
  const to = body.range_to as string;
  if (!from || !to) {
    return NextResponse.json({ error: "range_from, range_to are required" }, { status: 400 });
  }

  // 등록된 생일로 차트 재구성 후 일진 스코어링
  let ranked;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    const chart = buildChart(iso, profile.gender ?? "M", !!profile.birth_time);
    ranked = rankDates(chart, from, to, purpose);
  } catch (e) {
    console.error("premium taekil engine error:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const bestLines = ranked.best
    .map((d) => `- ${d.date} (${d.weekday}) ${d.ganji} [점수 ${d.score}]: ${d.notes.join("; ")}`)
    .join("\n");
  const avoidLines = ranked.avoid.length
    ? ranked.avoid.map((d) => `- ${d.date} (${d.weekday}) ${d.ganji}: ${d.notes.join("; ")}`).join("\n")
    : "- 해당 기간 내 뚜렷하게 피해야 할 날(충)은 없음";

  const engineSummary = `
목적: ${PURPOSE_LABEL[purpose] ?? purpose}
조회 기간: ${from} ~ ${to}
택일 기준: ${ranked.criteria.join(" / ")}

[엔진이 계산한 최길일 후보 — 실제 일진 기준]
${bestLines || "- 조건에 맞는 좋은 날을 찾지 못함"}

[피해야 할 날 — 일지 충]
${avoidLines}`.trim();

  const prompt = `당신은 명리학 택일 대가입니다. 아래는 사주 엔진이 실제 일진(日辰)을 계산해 산출한 택일 데이터입니다.
이 데이터에 근거하여 유료 프리미엄 택일 리포트를 작성하세요. 무료 버전보다 훨씬 깊고 구체적이어야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 택일 기준 】
(이 사람의 사주 관점에서 왜 이런 날들이 좋은지 원칙 2~3문장.)

【 추천 날짜 】
(위 최길일 후보를 좋은 순서대로 정리. 각 날짜마다 "YYYY-MM-DD (요일) — 이 사람에게 왜 좋은지 구체적 이유 2문장". 엔진이 준 날짜만 사용하고 임의로 다른 날짜를 만들지 말 것.)

【 피해야 할 날 】
(엔진이 준 피할 날을 이유와 함께. 없으면 "이 기간에는 크게 피할 날이 없습니다"라고 쓸 것.)

【 시간대·실행 조언 】
(목적에 맞는 실용적 조언 2~3문장.)

규칙:
- 반드시 위 엔진 데이터에 근거. 엔진이 준 날짜 외 임의 날짜 생성 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 寅申(인신)충. 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    // content 배열에서 text 블록을 찾는다 (thinking 블록이 앞에 올 수 있음)
    const textBlock = res.content.find((b) => b.type === "text");
    const report = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!report) {
      return NextResponse.json({ error: "생성에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
    }
    return NextResponse.json({
      report,
      best: ranked.best.map((d) => ({ date: d.date, weekday: d.weekday, ganji: d.ganji })),
      purpose,
      range: ranked.range,
    });
  } catch (e) {
    console.error("premium taekil LLM error:", e);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
