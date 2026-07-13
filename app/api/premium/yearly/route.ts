import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser } from "@/lib/billing/access";
import { buildChart, scoreYear } from "@/lib/saju-engine";

// 연운세 리포트 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향
export const maxDuration = 60;

// POST /api/premium/yearly — 로그인+프리미엄 필수. 등록된 내 사주로 세운·월운 실계산.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/yearly" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!(await isPremiumUser(userId))) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/subscribe" }, { status: 402 });
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  const body = await req.json();
  const year = parseInt(body.year) || new Date().getFullYear();

  // 캐시 조회 (premium_yearly_reports — 없으면 조용히 무시)
  try {
    const { data: cached } = await supabaseAdmin
      .from("premium_yearly_reports").select("content")
      .eq("saju_profile_id", profile.id).eq("year", year).limit(1).single();
    if (cached?.content) {
      return NextResponse.json({ report: cached.content, year, cached: true });
    }
  } catch { /* 테이블 없음 → 생성 진행 */ }

  let yr;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    const chart = buildChart(iso, profile.gender ?? "M", !!profile.birth_time);
    yr = scoreYear(chart, year);
  } catch (e) {
    console.error("premium yearly engine error:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  const monthLines = yr.months
    .map((m) => `- ${m.month}월 ${m.ganji} [${m.score}]: ${m.note}`)
    .join("\n");

  const engineSummary = `
대상 연도: ${year}년
세운(그 해 간지): ${yr.yearGanji} [종합 ${yr.yearScore}]
세운 특징: ${yr.yearNotes.join(" / ") || "특별한 합충 없음"}
현재 대운: ${yr.daewoon ? `${yr.daewoon.ganji} (${yr.daewoon.ageRange}, ${yr.daewoon.favorability})` : "정보 없음"}

[월별 흐름 — 점수가 높을수록 순조로운 달]
${monthLines}`.trim();

  const prompt = `당신은 명리학 대가입니다. 아래는 사주 엔진이 실제 세운(歲運)과 월운(月運)을 계산한 데이터입니다.
이 데이터에 근거하여 유료 프리미엄 ${year}년 연운세 리포트를 작성하세요. 무료 버전보다 훨씬 깊고 구체적이어야 합니다.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 ${year}년 총운 】
(세운과 현재 대운을 근거로 올 한 해의 큰 흐름을 한 문단.)

【 월별 흐름 】
(위 월별 점수 데이터를 근거로, 특히 좋은 달과 조심할 달을 구체적으로 짚어줄 것. 점수가 높은 달은 무엇을 하면 좋고, 낮은 달(충 등)은 무엇을 조심할지. 엔진이 준 월 데이터만 사용.)

【 재물·직업운 】
(2~3문장.)

【 관계·건강운 】
(2~3문장. 특히 일지 충이 있는 달의 건강·이동 주의를 반영.)

【 ${year}년 조언 】
(2~3문장. 실용적으로.)

규칙:
- 반드시 위 엔진 데이터에 근거. 엔진이 준 달·점수와 모순되는 서술 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 丙午(병오)년, 寅申(인신)충.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    });
    // content 배열에서 text 블록을 찾는다 (thinking 블록이 앞에 올 수 있음)
    const textBlock = res.content.find((b) => b.type === "text");
    const report = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!report) {
      return NextResponse.json({ error: "생성에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
    }

    // 캐시 저장 (테이블 없으면 무시)
    try {
      await supabaseAdmin.from("premium_yearly_reports").upsert(
        { saju_profile_id: profile.id, user_id: userId, year, content: report },
        { onConflict: "saju_profile_id,year" }
      );
    } catch { /* noop */ }

    return NextResponse.json({ report, year, cached: false });
  } catch (e) {
    console.error("premium yearly LLM error:", e);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
