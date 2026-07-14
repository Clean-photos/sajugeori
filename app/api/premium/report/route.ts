import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser } from "@/lib/billing/access";

// 프리미엄 사주 풀이 8개 섹션 키 (프리미엄 페이지 SECTIONS와 일치)
const SECTION_KEYS = [
  "personality", "career", "money", "love",
  "health", "life_pattern", "current_phase", "yearly",
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];
type Report = Record<SectionKey, string>;

// 사주 풀이 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향 (기본 10초로는 부족)
export const maxDuration = 60;

const elementGuide: Record<string, string> = {
  "木": "동쪽·숲·공원", "火": "남쪽·따뜻한 곳",
  "土": "중앙·내륙", "金": "서쪽·도시", "水": "북쪽·바다·강변",
};

// GET /api/premium/report — 로그인+프리미엄 필수. 캐시 있으면 반환, 없으면 생성.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium" }, { status: 401 });
  }
  const userId = session.user.id;

  const premium = await isPremiumUser(userId);
  if (!premium) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/subscribe" }, { status: 402 });
  }

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

  // 강제 재생성 여부
  const regenerate = req.nextUrl.searchParams.get("regenerate") === "1";

  // 캐시 조회 (premium_reports 테이블 — 없으면 조용히 무시)
  if (!regenerate) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_reports").select("content")
        .eq("saju_profile_id", profile.id).limit(1).single();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  const report = await generateReport(j);
  if (!report) {
    return NextResponse.json({ error: "생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  // 캐시 저장 (테이블 없으면 무시)
  try {
    await supabaseAdmin.from("premium_reports").upsert(
      { saju_profile_id: profile.id, user_id: userId, content: report },
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
  const earlyLuck = luckCycles.slice(0, 8)
    .map((c) => `${c.start_age}~${c.end_age}세 ${c.ganji}(${c.favorability})`).join(", ");

  const summary = `
일간: ${identity?.day_master ?? ""} / 강약: ${identity?.strength_label ?? ""}
핵심 설명: ${identity?.core_description ?? ""}
강점: ${personality?.strengths?.slice(0, 4).join(", ") ?? ""}
약점: ${personality?.weaknesses?.slice(0, 4).join(", ") ?? ""}
오행 분포: ${elements ? Object.entries(elements).map(([e, v]) => `${e}${v}`).join(" ") : ""}
용신: ${yongsin.join(", ")} / 개운 장소: ${kaiun || "없음"}
대운 흐름(초년~중년): ${earlyLuck || "없음"}
핵심 태그: ${coreTags.map((t) => t.tag).join(", ")}
현재 연도: ${new Date().getFullYear()}년
  `.trim();

  const prompt = `당신은 명리학 대가입니다. 아래 사주 데이터로 유료 프리미엄 사주 풀이를 작성하세요.
무료 버전보다 훨씬 깊고 구체적이어야 합니다.

${summary}

다음 8개 항목을 JSON으로만 응답하세요. 각 값은 문자열이며, 항목당 4~6문장의 풍부한 풀이.

{
  "personality": "타고난 성격·기질. 일간과 강약, 핵심 태그 근거로 깊이 있게.",
  "career": "직업운. 어떤 분야·업무 스타일이 맞는지, 대운 흐름과 연결해 구체적으로.",
  "money": "재물운. 재물을 모으는 방식, 주의할 시기, 오행 균형 관점.",
  "love": "연애·결혼운. 관계에서의 강점과 약점, 어떤 상대와 맞는지.",
  "health": "건강. 오행 과부족 기반으로 주의할 신체 부위·습관.",
  "life_pattern": "인생에서 반복되는 패턴과 중요한 교훈.",
  "current_phase": "현재 대운 시기의 의미와 앞으로 몇 년간의 흐름. 현재 나이 기준.",
  "yearly": "향후 3년(올해 포함) 연도별 핵심 운세를 연도별로."
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
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    // content 배열에서 text 블록을 찾는다 (thinking 블록이 앞에 올 수 있음)
    const textBlock = res.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    // ```json 펜스 제거 후 첫 { ~ 마지막 } 추출
    const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("premium report: JSON 없음. stop_reason=", res.stop_reason);
      return null;
    }
    const parsed = JSON.parse(match[0]) as Partial<Report>;

    const report = {} as Report;
    for (const k of SECTION_KEYS) report[k] = parsed[k]?.trim() || "데이터가 부족해 이 항목은 준비 중입니다.";
    return report;
  } catch (e) {
    console.error("premium report error:", e);
    return null;
  }
}
