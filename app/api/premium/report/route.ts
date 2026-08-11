import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { generateReport } from "@/lib/premium/saju-generate";

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

  const report = await generateReport(j);
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

