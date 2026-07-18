import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass, consumeOneTimePass } from "@/lib/billing/access";
import { SALPURI_ONE } from "@/lib/billing/plans";
import { buildChart, stemBranchKr } from "@/lib/saju-engine";

// 살풀이 리포트 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향
export const maxDuration = 60;

// POST /api/premium/salpuri — 로그인+프리미엄 필수. 등록된 내 사주의 신살을 실계산해 풀이.
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/salpuri" }, { status: 401 });
  }
  const userId = session.user.id;

  // 구독자 또는 990원 1회 이용권 보유자만 통과
  const premium = await isPremiumUser(userId);
  const passId = premium ? null : await findUnusedOneTimePass(userId, SALPURI_ONE.id);
  if (!premium && !passId) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/salpuri" }, { status: 402 });
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  let chart;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    chart = buildChart(iso, profile.gender ?? "M", !!profile.birth_time);
  } catch (e) {
    console.error("premium salpuri engine error:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  // 같은 살이 여러 자리에 걸릴 수 있으므로 이름별로 위치를 묶는다.
  const grouped = new Map<string, { where: string[]; meaning: string }>();
  for (const s of chart.sal) {
    const cur = grouped.get(s.name);
    if (cur) cur.where.push(s.where);
    else grouped.set(s.name, { where: [s.where], meaning: s.meaning });
  }

  const salLines = [...grouped.entries()]
    .map(([name, v]) => `- ${name} (${v.where.join(", ")}): ${v.meaning}`)
    .join("\n");

  const engineSummary = `
일주(日柱): ${stemBranchKr(chart.pillars.day.stem, chart.pillars.day.branch)}
일간(日干): ${chart.day_master} / 오행 ${chart.day_master_element}
신강·신약: ${chart.strength.verdict} (${chart.strength.detail})
용신 후보: 억부 ${chart.yongsin.eokbu_candidates.join("·") || "없음"} / 조후 ${chart.yongsin.johu_candidates.join("·") || "없음"}

[사주 엔진이 실제로 검출한 신살]
${salLines || "검출된 신살 없음"}`.trim();

  const prompt = `당신은 명리학 대가입니다. 아래는 사주 엔진이 이 사람의 사주에서 실제로 검출한 신살(神殺) 데이터입니다.
이 데이터에 근거하여 유료 프리미엄 "살풀이" 리포트를 작성하세요.

${engineSummary}

다음 형식으로 정확히 작성하세요:

【 내 사주의 살 】
(검출된 신살을 하나씩 짚어 주되, 각 살이 어느 자리(연지·월지·일지·시지)에 있는지에 따라 어떤 영역에 작용하는지 설명. 연지=조상·초년, 월지=부모·사회활동, 일지=배우자·본인, 시지=자식·말년. 검출된 살이 없으면 "뚜렷한 신살이 없다"는 것이 무엇을 뜻하는지 설명할 것.)

【 강점으로 쓰는 법 】
(검출된 살들이 지닌 긍정적 면과 그것을 살릴 수 있는 방향. 구체적으로.)

【 조심할 지점 】
(각 살의 그림자와 실제로 조심할 상황. 겁주지 말고 담담하게.)

【 종합 조언 】
(2~3문장. 신강·신약과 용신을 함께 고려해 실용적으로.)

규칙:
- 반드시 위 엔진 데이터에 근거. 엔진이 검출하지 않은 신살을 지어내지 말 것.
- 신살은 사주 해석의 보조 요소임을 잊지 말고, 하나의 살로 운명을 단정하는 서술 금지.
- 겁을 주거나 불안을 조장하는 표현 금지. 흉살도 중립적 에너지로 설명하고 활용법을 함께 제시할 것.
- 부적·굿·비방 등 해소를 위한 금전 지출을 암시하는 서술 절대 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지). 섹션 제목은 【 】 형식만.
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 寅申(인신)충. 단, 이미 한글로만 쓰인 단어에는 괄호로 같은 한글을 또 붙이지 말 것.`;

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

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (passId) await consumeOneTimePass(passId);

    return NextResponse.json({
      report,
      sal: [...grouped.entries()].map(([name, v]) => ({ name, where: v.where })),
    });
  } catch (e) {
    console.error("premium salpuri LLM error:", e);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
