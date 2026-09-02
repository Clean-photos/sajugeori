import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  parseTargetBody, resolveTarget, readAdhocCache, writeAdhocCache,
  ensureOwnProfileId, isoOf, timeKeyOf, loadOwnProfile, sameAsProfile,
} from "@/lib/billing/report-target";
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

  const body = await req.json().catch(() => ({}));
  const year = parseInt(body.year) || new Date().getFullYear();

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주를 볼 방법이 없던 원인이었다.
  const parsed = parseTargetBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);
  // 같은 대상이라도 연도가 다르면 다른 리포트다.
  const variant = String(year);

  // 캐시 조회 (테이블 없으면 조용히 무시)
  if (isAdhoc) {
    const cached = await readAdhocCache(userId, PRODUCT_ID, input, variant);
    if (cached) return NextResponse.json({ report: cached, year, cached: true, adhoc: true });
  } else if (ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_yearly_reports").select("content")
        .eq("saju_profile_id", ownProfile.id).eq("year", year).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, year, cached: true });
      }
    } catch { /* 테이블 없음 → 생성 진행 */ }
  }

  // 동시 중복 생성(더블클릭 레이스) 차단
  const started = await startAttempt(userId, PRODUCT_ID, undefined, {
    birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime), gender: input.gender, year,
  });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  let yr;
  try {
    const chart = buildChart(isoOf(input), input.gender, !!input.birthTime);
    yr = scoreYear(chart, year);
  } catch (e) {
    console.error("premium yearly engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  try {
    const report = await generateYearlyReport(yr, year);

    // 캐시 저장 (테이블 없으면 무시)
    if (isAdhoc) {
      // 1회성 — 본인 프로필도, 본인 리포트 캐시도 건드리지 않는다.
      await writeAdhocCache(userId, PRODUCT_ID, input, report, variant);
    } else {
      // 등록된 사주가 없던 사람이면 이 입력이 본인 프로필로 저장된다(016 규칙).
      const profileId = await ensureOwnProfileId(userId, input, ownProfile);
      if (profileId) {
        try {
          await supabaseAdmin.from("premium_yearly_reports").upsert(
            { saju_profile_id: profileId, user_id: userId, year, content: report, expires_at: reportExpiresAtIso() },
            { onConflict: "saju_profile_id,year" }
          );
        } catch { /* noop */ }
      }
    }

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

/**
 * DELETE /api/premium/yearly — 로그인 필수. 사용자가 자기 연운세 결과(연도별)를 직접 삭제.
 * body: { year, birth_date, birth_time|null, gender } — 지금 화면에 띄운 리포트의 대상.
 * 대상을 받지 않으면 가족 리포트를 지우려다 본인 리포트가 지워진다.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const year = parseInt(body.year) || new Date().getFullYear();
  const parsed = parseTargetBody(body);
  const ownProfile = await loadOwnProfile(userId);

  if (parsed.ok && ownProfile && !sameAsProfile(parsed.input, ownProfile)) {
    const input = parsed.input;
    await supabaseAdmin.from("premium_adhoc_reports").delete()
      .eq("user_id", userId).eq("product_id", PRODUCT_ID)
      .eq("birth_date", input.birthDate).eq("birth_time", timeKeyOf(input.birthTime))
      .eq("gender", input.gender).eq("variant", String(year));
    return NextResponse.json({ ok: true });
  }

  if (!ownProfile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }
  await supabaseAdmin.from("premium_yearly_reports").delete()
    .eq("saju_profile_id", ownProfile.id).eq("user_id", userId).eq("year", year);

  return NextResponse.json({ ok: true });
}
