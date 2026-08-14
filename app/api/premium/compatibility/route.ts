import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { buildChart, mutualAnalysis } from "@/lib/saju-engine";
import { generateCompatibilityReport } from "@/lib/premium/compat-generate";

// 궁합 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/compat-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
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

  // "A" 쪽도 임의의 사람으로 직접 입력할 수 있다(친구 커플·부모님 궁합 등).
  // 체크박스를 안 켰으면 지금까지처럼 로그인 사용자의 등록된 본인 사주를 쓴다.
  const useCustomA = !!input.custom_person_a;
  const personABirth = (useCustomA ? input.person_a_birth : profile.birth_date) as string;
  const personAGender = (useCustomA ? (input.person_a_gender ?? "M") : (profile.gender ?? "M")) as "M" | "F";
  if (useCustomA && !personABirth) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "person_a_birth is required" }, { status: 400 });
  }

  // 같은 두 사람·같은 관계유형 조합이면 재생성하지 않는다 (재열람 무료).
  const cacheKey = {
    saju_profile_id: profile.id,
    person_a_birth: personABirth, person_a_gender: personAGender,
    partner_birth: partnerBirth, partner_gender: partnerGender, context,
  };
  try {
    const { data: cached } = await supabaseAdmin
      .from("premium_compatibility_reports").select("content, score")
      .match(cacheKey).or(notExpiredFilter()).limit(1).single();
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

  // A 사주(등록된 내 사주 또는 직접 입력한 임의의 사람) + 상대 사주 재구성 후 양방향 분석.
  // 커스텀 A는 시각 정보를 받지 않으므로(폼에 시각 입력이 없다) 시주 제외로 계산한다.
  let mutual;
  let normalizedScore = 50;
  try {
    const aHasTime = !useCustomA && !!profile.birth_time;
    const aIso = aHasTime ? `${personABirth}T${profile.birth_time}:00` : `${personABirth}T00:00:00`;
    const personALabel = useCustomA ? "A" : "나";
    const me = buildChart(aIso, personAGender, aHasTime);
    const other = buildChart(`${partnerBirth}T00:00:00`, partnerGender, false);
    mutual = mutualAnalysis(me, other, personALabel, useCustomA ? "B" : "상대", context);
    normalizedScore = Math.min(100, Math.max(0, Math.round(38 + mutual.combinedScore * 6)));
  } catch (e) {
    console.error("premium compatibility engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  try {
    const report = await generateCompatibilityReport(
      mutual, context, normalizedScore,
      useCustomA ? { a: "A", b: "B" } : { a: "나", b: "상대" }
    );

    // 캐시 저장 (테이블 없으면 무시)
    try {
      await supabaseAdmin.from("premium_compatibility_reports").insert({
        ...cacheKey, user_id: userId, content: report, score: normalizedScore, expires_at: reportExpiresAtIso(),
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

// DELETE /api/premium/compatibility — 로그인 필수. 사용자가 특정 상대와의 궁합 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const partnerBirth = body.partner_birth as string;
  const partnerGender = (body.partner_gender ?? "F") as "M" | "F";
  const context = (body.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    return NextResponse.json({ error: "partner_birth is required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();
  if (!profile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  const useCustomA = !!body.custom_person_a;
  const personABirth = (useCustomA ? body.person_a_birth : profile.birth_date) as string;
  const personAGender = (useCustomA ? (body.person_a_gender ?? "M") : (profile.gender ?? "M")) as "M" | "F";

  await supabaseAdmin.from("premium_compatibility_reports").delete()
    .eq("saju_profile_id", profile.id).eq("user_id", userId)
    .eq("person_a_birth", personABirth).eq("person_a_gender", personAGender)
    .eq("partner_birth", partnerBirth).eq("partner_gender", partnerGender).eq("context", context);

  return NextResponse.json({ ok: true });
}
