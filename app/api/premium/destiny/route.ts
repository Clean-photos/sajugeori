import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkDestinyAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";

// 운명 설계도 — 프리미엄 사주(8영역)에 평생 대운 로드맵·인생 전환점·실행 전략을
// 더한 확장판. 7,900원 직구매 또는 990원 프리미엄 사주 보유자의 6,900원
// 업그레이드로 열람한다(가격 설계는 lib/billing/plans.ts 참고).
const SECTION_KEYS = [
  "personality", "career", "money", "love",
  "health", "life_pattern", "current_phase", "yearly",
  "lifetime_daewoon", "life_turning_points", "action_strategy", "final_summary",
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];
type Report = Record<SectionKey, string>;

export const maxDuration = 60;

const PRODUCT_ID = "destiny_blueprint_one";

const elementGuide: Record<string, string> = {
  "木": "동쪽·숲·공원", "火": "남쪽·따뜻한 곳",
  "土": "중앙·내륙", "金": "서쪽·도시", "水": "북쪽·바다·강변",
};

// GET /api/premium/destiny — 로그인+열람 자격 필수. 캐시 있으면 반환, 없으면 생성.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/destiny" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, saju_json")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.saju_json) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  const j = profile.saju_json;
  const dayMaster = j.identity?.day_master ?? "";
  const strength = j.identity?.strength_label ?? "";

  const regenerate = req.nextUrl.searchParams.get("regenerate") === "1";

  if (!regenerate) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_destiny_reports").select("content")
        .eq("saju_profile_id", profile.id).or(notExpiredFilter()).limit(1).single();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  const { allowed, passId } = await checkDestinyAccess(userId);
  if (!allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/menu" }, { status: 402 });
  }

  const report = await generateReport(j);
  if (!report) {
    await finishAttemptFailed(started.attemptId, "빈 응답");
    return NextResponse.json({ error: "생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  if (passId) await consumeOneTimePass(passId);
  await finishAttemptDone(started.attemptId);

  try {
    await supabaseAdmin.from("premium_destiny_reports").upsert(
      { saju_profile_id: profile.id, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
      { onConflict: "saju_profile_id" }
    );
  } catch { /* noop */ }

  return NextResponse.json({ report, day_master: dayMaster, strength, cached: false });
}

async function generateReport(j: Record<string, unknown>): Promise<Report | null> {
  const identity = j.identity as Record<string, string> | undefined;
  const personality = j.personality as { strengths?: string[]; weaknesses?: string[] } | undefined;
  const elements = j.elements as Record<string, number> | undefined;
  const yongsinObj = j.yongsin as { eokbu?: string[]; johu?: string[]; climate?: string } | undefined;
  const luckCycles = (j.luck_cycles as Array<{ start_age: number; end_age: number; ganji: string; favorability: string }>) ?? [];
  const coreTags = (j.core_tags as Array<{ tag: string }>) ?? [];

  const yongsin = (yongsinObj?.eokbu?.length ? yongsinObj.eokbu : yongsinObj?.johu) ?? [];
  const kaiun = yongsin.map((e) => elementGuide[e] ?? e).join(", ");
  const allLuck = luckCycles
    .map((c) => `${c.start_age}~${c.end_age}세 ${c.ganji}(${c.favorability})`).join(", ");

  const summary = `
일간: ${identity?.day_master ?? ""} / 강약: ${identity?.strength_label ?? ""}
핵심 설명: ${identity?.core_description ?? ""}
강점: ${personality?.strengths?.slice(0, 4).join(", ") ?? ""}
약점: ${personality?.weaknesses?.slice(0, 4).join(", ") ?? ""}
오행 분포: ${elements ? Object.entries(elements).map(([e, v]) => `${e}${v}`).join(" ") : ""}
용신: ${yongsin.join(", ")} / 개운 장소: ${kaiun || "없음"}
평생 대운 전체 흐름: ${allLuck || "없음"}
핵심 태그: ${coreTags.map((t) => t.tag).join(", ")}
현재 연도: ${new Date().getFullYear()}년
  `.trim();

  const prompt = `당신은 명리학 대가입니다. 아래 사주 데이터로 "운명 설계도"라는 이름의 최상위 프리미엄
사주 풀이를 작성하세요. 일반 프리미엄 사주보다도 훨씬 깊고, 평생에 걸친 흐름과 구체적인
실행 전략까지 담아야 합니다.

${summary}

다음 12개 항목을 JSON으로만 응답하세요. 각 값은 문자열입니다.
personality~yearly 8개는 각 4~6문장, 나머지 4개는 각 5~7문장으로 풍부하게 쓰세요.

{
  "personality": "타고난 성격·기질. 일간과 강약, 핵심 태그 근거로 깊이 있게.",
  "career": "직업운. 어떤 분야·업무 스타일이 맞는지, 대운 흐름과 연결해 구체적으로.",
  "money": "재물운. 재물을 모으는 방식, 주의할 시기, 오행 균형 관점.",
  "love": "연애·결혼운. 관계에서의 강점과 약점, 어떤 상대와 맞는지.",
  "health": "건강. 오행 과부족 기반으로 주의할 신체 부위·습관.",
  "life_pattern": "인생에서 반복되는 패턴과 중요한 교훈.",
  "current_phase": "현재 대운 시기의 의미와 앞으로 몇 년간의 흐름. 현재 나이 기준.",
  "yearly": "향후 3년(올해 포함) 연도별 핵심 운세를 연도별로.",
  "lifetime_daewoon": "위 '평생 대운 전체 흐름' 데이터를 근거로, 초년부터 말년까지 대운이 어떻게 이어지는지 하나의 로드맵으로. 어느 시기가 도약기이고 어느 시기가 내실을 다질 시기인지 짚어줄 것.",
  "life_turning_points": "평생 대운 흐름 중 특히 중요한 전환점 3개를 골라, 각각 몇 세 무렵이고 무엇이 바뀌는 시기인지 구체적으로.",
  "action_strategy": "지금부터 실천할 수 있는 구체적 전략 3가지. 위 성격·재물·직업 분석과 연결되게, 추상적 조언이 아니라 실행 가능한 행동으로.",
  "final_summary": "이 사람의 사주 전체를 관통하는 핵심을 두세 문장으로 압축한 총평."
}

규칙:
- 반드시 데이터에 근거. 과장·미신적 단정 금지.
- 한국어. 마크다운 절대 금지(#, **, *, - 등 기호 사용 금지).
- 한자는 반드시 한글 독음 병기. 예: 庚(경), 辛未(신미), 身弱(신약). 단, 이미 한글로만 쓰인 단어(신약·극신약 등)에는 괄호로 같은 한글을 또 붙이지 말 것.
- JSON 외 다른 텍스트 없이 JSON만 응답.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-5",
      max_tokens: 7000,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = res.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("destiny report: JSON 없음. stop_reason=", res.stop_reason);
      return null;
    }
    const parsed = JSON.parse(match[0]) as Partial<Report>;

    const report = {} as Report;
    for (const k of SECTION_KEYS) report[k] = parsed[k]?.trim() || "데이터가 부족해 이 항목은 준비 중입니다.";
    return report;
  } catch (e) {
    console.error("destiny report error:", e);
    return null;
  }
}
