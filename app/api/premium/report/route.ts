import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { generateReport } from "@/lib/premium/saju-generate";
import { runSajuEngine } from "@/lib/saju-engine";
import { parseTargetBody, resolveTarget, saveAsOwnProfile } from "@/lib/billing/report-target";

const PRODUCT_ID = "saju_one";

// 사주 풀이 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향 (기본 10초로는 부족)
export const maxDuration = 60;

// GET /api/premium/report — 로그인+프리미엄 필수. 캐시 있으면 반환, 없으면 생성.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, saju_json")
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

  // 캐시를 게이트보다 먼저 본다. 990원 이용권으로 이미 본 사용자는 이용권이 소진된 뒤라
  // 게이트를 먼저 통과시키면 자기 결과를 다시 열지 못한다. 본인 것만 조회하므로 안전하다.
  if (!regenerate) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_reports").select("content")
        .eq("saju_profile_id", profile.id).or(notExpiredFilter()).limit(1).single();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  // 동시 중복 생성(더블클릭 레이스) 차단 — 입력은 서버 저장된 profile이라 재입력 걱정은 없다.
  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  // 구독자 또는 990원 1회 이용권 보유자만 신규 생성 가능
  const { allowed, passId } = await checkReportAccess(userId, PRODUCT_ID);
  if (!allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=saju_one" }, { status: 402 });
  }

  const report = await generateReport(j, profile.birth_date);
  if (!report) {
    await finishAttemptFailed(started.attemptId, "빈 응답");
    return NextResponse.json({ error: "생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  if (passId) await consumeOneTimePass(passId);
  await finishAttemptDone(started.attemptId);

  // 캐시 저장 (테이블 없으면 무시)
  try {
    await supabaseAdmin.from("premium_reports").upsert(
      { saju_profile_id: profile.id, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
      { onConflict: "saju_profile_id" }
    );
  } catch { /* noop */ }

  return NextResponse.json({ report, day_master: dayMaster, strength, cached: false });
}

/**
 * POST /api/premium/report — 화면에서 사주를 직접 입력해 풀이를 받는다.
 * body: { birth_date, birth_time|null, gender, calendar? }
 *
 * 등록된 사주가 없던 사람은 이 입력이 본인 프로필로 저장되고(온보딩과 동일),
 * 이미 등록된 사주가 있는 사람은 프로필을 건드리지 않고 1회성으로 처리한다.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = parseTargetBody(await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { birthDate, birthTime, gender, calendar } = parsed.input;

  let engine: ReturnType<typeof runSajuEngine>;
  try {
    engine = runSajuEngine({ birth_date: birthDate, birth_time: birthTime, calendar, gender });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "사주 계산 오류" }, { status: 400 });
  }

  const j = engine.saju_json as Record<string, unknown>;
  const identity = (j.identity ?? {}) as Record<string, string>;
  const dayMaster = identity.day_master ?? "";
  const strength = identity.strength_label ?? "";

  // 등록된 본인 사주와 **같은 대상인지**로 "본인" / "1회성"이 갈린다.
  // 예전에는 "등록된 사주가 있으면 무조건 1회성"이라 체크박스로 본인 사주를 불러와
  // 그대로 확정해도 1회성 캐시로 새로 만들어졌다 — 이미 결제해 만든 본인 리포트가
  // 있는데도 다시 생성되고 이용권이 또 소진되는 문제였다.
  const { ownProfile, isAdhoc } = await resolveTarget(userId, parsed.input);
  const existingProfile = isAdhoc ? ownProfile : null;

  const timeKey = birthTime ?? "";

  // 1회성인 경우 이미 만들어 둔 같은 조건의 리포트가 있으면 재사용한다(재열람 무료).
  if (existingProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_saju_adhoc_reports").select("content")
        .eq("user_id", userId).eq("birth_date", birthDate)
        .eq("birth_time", timeKey).eq("gender", gender)
        .or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true, adhoc: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  // 본인 대상이면 기존 premium_reports 캐시를 먼저 본다(재열람 무료).
  if (!isAdhoc && ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_reports").select("content")
        .eq("saju_profile_id", ownProfile.id).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  const started = await startAttempt(userId, PRODUCT_ID, undefined, { birth_date: birthDate, birth_time: timeKey, gender });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  const { allowed, passId } = await checkReportAccess(userId, PRODUCT_ID);
  if (!allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=saju_one" }, { status: 402 });
  }

  const report = await generateReport(j, birthDate);
  if (!report) {
    await finishAttemptFailed(started.attemptId, "빈 응답");
    return NextResponse.json({ error: "생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  if (passId) await consumeOneTimePass(passId);
  await finishAttemptDone(started.attemptId);

  if (existingProfile?.id) {
    // 1회성 — 본인 프로필은 그대로 두고 별도 캐시에만 저장한다.
    try {
      await supabaseAdmin.from("premium_saju_adhoc_reports").upsert(
        {
          user_id: userId, birth_date: birthDate, birth_time: timeKey, gender,
          content: report, expires_at: reportExpiresAtIso(),
        },
        { onConflict: "user_id,birth_date,birth_time,gender" }
      );
    } catch { /* noop */ }
    return NextResponse.json({ report, day_master: dayMaster, strength, cached: false, adhoc: true });
  }

  // 본인 대상 — 등록된 사주가 없던 사람이면 이 입력을 본인 프로필로 저장한다(016 규칙).
  const createdId = ownProfile?.id ?? await saveAsOwnProfile(userId, parsed.input, engine);
  const created = createdId ? { id: createdId } : null;

  if (created?.id) {
    try {
      await supabaseAdmin.from("premium_reports").upsert(
        { saju_profile_id: created.id, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
        { onConflict: "saju_profile_id" }
      );
    } catch { /* noop */ }
  }

  return NextResponse.json({ report, day_master: dayMaster, strength, cached: false, savedProfile: !ownProfile });
}

// DELETE /api/premium/report — 로그인 필수. 사용자가 자기 프리미엄 사주 결과를 직접 삭제.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();
  if (!profile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("premium_reports").delete()
    .eq("saju_profile_id", profile.id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}

