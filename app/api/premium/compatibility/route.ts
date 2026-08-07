import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { buildChart, mutualAnalysis } from "@/lib/saju-engine";

// 궁합 리포트 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향
export const maxDuration = 60;

const CONTEXT_LABEL: Record<string, string> = {
  romance: "연애·결혼", work: "직장·비즈니스", friend: "친구·지인",
};

type Ctx = "romance" | "work" | "friend";

const PRODUCT_ID = "compatibility_one";

// POST /api/premium/compatibility — 로그인+프리미엄 필수. 등록된 내 사주 + 상대 정보로 양방향 궁합.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 새로 보낸 입력값 대신
// 최초 시도 때 저장해 둔 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/compatibility" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const started = await startAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }
  const input = started.input;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  const partnerBirth = input.partner_birth as string;
  const partnerGender = (input.partner_gender ?? "F") as "M" | "F";
  const context = (input.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "partner_birth is required" }, { status: 400 });
  }

  // 같은 상대·같은 관계유형 조합이면 재생성하지 않는다 (재열람 무료).
  const cacheKey = { saju_profile_id: profile.id, partner_birth: partnerBirth, partner_gender: partnerGender, context };
  try {
    const { data: cached } = await supabaseAdmin
      .from("premium_compatibility_reports").select("content, score")
      .match(cacheKey).limit(1).single();
    if (cached?.content) {
      await discardAttempt(started.attemptId);
      return NextResponse.json({ report: cached.content, score: cached.score, context, cached: true });
    }
  } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }

  // 구독자 또는 990원 단건 이용권 보유자만 통과. 이용권은 생성 성공 후 소진한다.
  const access = await checkReportAccess(userId, PRODUCT_ID);
  if (!access.allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=compatibility_one" }, { status: 402 });
  }

  // 내 사주(등록된 생일) + 상대 사주 재구성 후 양방향 분석
  let mutual;
  let normalizedScore = 50;
  try {
    const myIso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    const me = buildChart(myIso, profile.gender ?? "M", !!profile.birth_time);
    const other = buildChart(`${partnerBirth}T00:00:00`, partnerGender, false);
    mutual = mutualAnalysis(me, other, "나", "상대", context);
    normalizedScore = Math.min(100, Math.max(0, Math.round(38 + mutual.combinedScore * 6)));
  } catch (e) {
    console.error("premium compatibility engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  const engineSummary = `
관계 유형: ${CONTEXT_LABEL[context] ?? context}
종합 궁합 점수: ${normalizedScore}/100

[상대가 나에게 주는 것 — 상대→나 분석]
${mutual.partnerToMe.notes.map((n) => `- ${n}`).join("\n") || "- 특별한 상호작용 없음"}

[내가 상대에게 주는 것 — 나→상대 분석]
${mutual.meToPartner.notes.map((n) => `- ${n}`).join("\n") || "- 특별한 상호작용 없음"}`.trim();

  const prompt = `당신은 명리학 궁합 대가입니다. 아래는 사주 엔진이 두 사람의 사주를 양방향으로 분석한 데이터입니다.
이 데이터에 근거하여 유료 프리미엄 궁합 리포트를 작성하세요. 무료 버전보다 훨씬 깊고 구체적이어야 하며,
특히 "서로 주고받는 것"의 양방향 흐름을 살려서 작성하세요.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 종합 궁합 】 ${normalizedScore}점 / 100점
(두 사람의 궁합을 한 문단으로 총평. 관계 유형(${CONTEXT_LABEL[context] ?? context})에 맞게.)

【 서로에게 주는 것 】
(상대가 나에게 채워주는 것과, 내가 상대에게 채워주는 것을 각각 2~3문장으로. 양방향의 차이를 분명히 드러낼 것.)

【 잘 맞는 부분 】
(구체적 강점 2~3가지. 엔진 데이터 근거로.)

【 주의할 부분 】
(마찰·소모 가능성 2~3가지. 없으면 솔직히 "큰 마찰 요인은 적습니다"라고 쓸 것.)

【 관계를 위한 조언 】
(관계 유형에 맞는 실용적 조언 2~3문장.)

【 한줄 요약 】
(60자 이내 한 문장, 마침표로 끝낼 것.)

규칙:
- 반드시 위 엔진 데이터에 근거. 과장·미신적 단정 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 巳申(사신)합. 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
- 나이 차이(연상·연하 등)는 이 분석의 근거가 아니므로 언급하지 말 것.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });
    // content 배열에서 text 블록을 찾는다 (thinking 블록이 앞에 올 수 있음)
    const textBlock = res.content.find((b) => b.type === "text");
    const report = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!report) {
      await finishAttemptFailed(started.attemptId, "빈 응답");
      return NextResponse.json({ error: "생성에 실패했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
    }

    // 캐시 저장 (테이블 없으면 무시)
    try {
      await supabaseAdmin.from("premium_compatibility_reports").insert({
        ...cacheKey, user_id: userId, content: report, score: normalizedScore,
      });
    } catch { /* noop */ }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (access.passId) await consumeOneTimePass(access.passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({ report, score: normalizedScore, context, cached: false });
  } catch (e) {
    console.error("premium compatibility LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}
