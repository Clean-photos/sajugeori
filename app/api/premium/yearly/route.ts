import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { buildChart, scoreYear } from "@/lib/saju-engine";
import { generateYearlyReport } from "@/lib/premium/yearly-generate";

// 생성이 여러 병렬 LLM 호출로 나뉘어 있어도(lib/premium/yearly-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "yearly_one";

// POST /api/premium/yearly — 로그인+프리미엄 필수. 등록된 내 사주로 세운·월운 실계산.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/yearly" }, { status: 401 });
  }
  const userId = session.user.id;

  // 구독자 또는 990원 단건 이용권 보유자만 통과. 이용권은 생성 성공 후 소진한다.
  const access = await checkReportAccess(userId, "yearly_one");
  if (!access.allowed) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=yearly_one" }, { status: 402 });
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
      .eq("saju_profile_id", profile.id).eq("year", year).or(notExpiredFilter()).limit(1).single();
    if (cached?.content) {
      return NextResponse.json({ report: cached.content, year, cached: true });
    }
  } catch { /* 테이블 없음 → 생성 진행 */ }

  // 동시 중복 생성(더블클릭 레이스) 차단
  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id, year });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  let yr;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    const chart = buildChart(iso, profile.gender ?? "M", !!profile.birth_time);
    yr = scoreYear(chart, year);
  } catch (e) {
    console.error("premium yearly engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  try {
    const report = await generateYearlyReport(yr, year);

    // 캐시 저장 (테이블 없으면 무시)
    try {
      await supabaseAdmin.from("premium_yearly_reports").upsert(
        { saju_profile_id: profile.id, user_id: userId, year, content: report, expires_at: reportExpiresAtIso() },
        { onConflict: "saju_profile_id,year" }
      );
    } catch { /* noop */ }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (access.passId) await consumeOneTimePass(access.passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({ report, year, cached: false });
  } catch (e) {
    console.error("premium yearly LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}
