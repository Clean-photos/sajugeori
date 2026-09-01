import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { buildChart } from "@/lib/saju-engine/engine";
import { classify } from "@/lib/wuxing/classify";
import { buildDiagnosis } from "@/lib/wuxing/diagnosis";
import { generateDiagnosisNarrative } from "@/lib/wuxing/diagnosis-narrative";
import { buildSeunPrescription } from "@/lib/wuxing/seun-prescription";
import { generateSeunNarrative } from "@/lib/wuxing/seun-narrative";
import { buildWuxingReport, type WuxingNarratives } from "@/lib/wuxing/report";

// LLM 호출 2곳(§① 보충 문장·§⑥ 흐름 문단)이 병렬이라 개별 실측(6~14초)보다 여유 있게 잡는다.
// 실측(2026-08-31, claude-sonnet-5): 평균 9.2초, 최대 12.0초 — 60초 상한에 여유 충분.
export const maxDuration = 60;

const PRODUCT_ID = "wuxing_one";

/**
 * ⚠️ §13 작업 규칙: "개발은 진행하되 판매 노출 시점은 별도 지시". §10-9(결제 연결)로
 * checkReportAccess/consumeOneTimePass 정식 게이트를 붙였지만, WUXING_ENABLED
 * 플래그는 CEO 판단(2026-08-31)에 따라 **운영 킬스위치로 유지**한다 — 이유:
 *   ① 토스 카드사 심사가 아직 진행 중이라, 심사 완료 전까지는 실제 결제 버튼이
 *      뜨는 시점 자체를 코드 배포와 분리해 둘 필요가 있다
 *   ② 결제 게이트가 정상 작동해도, 생성 로직 버그가 나중에 발견되면 재배포 없이
 *      즉시 끌 수 있는 수단이 하나 더 있는 편이 안전하다(다른 990원 리포트에는
 *      없는 이중 안전장치이지만, 신규 상품 초기 안정화 기간에는 정당하다)
 * 값이 "1"이 아니면 로그인·결제 여부와 무관하게 404. Vercel에는 아직 미설정이라
 * 이번 배포로도 프로덕션은 비활성 상태 그대로다. 결제·노출 시점이 되면 CEO가
 * Vercel 환경변수만 켜면 된다(코드 변경 불필요).
 */
function isEnabled(): boolean {
  return process.env.WUXING_ENABLED === "1";
}

async function buildFullReport(chart: ReturnType<typeof buildChart>) {
  const cls = classify(chart);
  const diagnosis = buildDiagnosis(chart, cls);
  const seunPlan = buildSeunPrescription(chart, cls);

  // 서로 무관한 입력이라 병렬로 돌린다. 하나가 실패해도 나머지는 살리고,
  // 실패한 자리는 컴포넌트의 "준비하고 있습니다" 폴백이 자체 처리한다.
  const [diagnosisResult, seunFlowResult] = await Promise.allSettled([
    generateDiagnosisNarrative(diagnosis),
    generateSeunNarrative(chart, cls, seunPlan),
  ]);

  const narratives: WuxingNarratives = {};
  if (diagnosisResult.status === "fulfilled") narratives.diagnosis = diagnosisResult.value;
  else console.error("wuxing [한 줄 진단 보충 문장] 실패:", diagnosisResult.reason);
  if (seunFlowResult.status === "fulfilled") narratives.seunFlow = seunFlowResult.value;
  else console.error("wuxing [3년 흐름 문단] 실패:", seunFlowResult.reason);

  return buildWuxingReport(chart, cls, narratives);
}

/**
 * POST /api/premium/wuxing — 로그인+프리미엄 필수. 등록된 내 사주로 생성.
 * 다른 990원 리포트(yearly 등)와 동일 패턴: 캐시 → 게이트 → 생성 → 소진 → 캐시 저장.
 */
export async function POST() {
  if (!isEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/ohang" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles")
    .select("id, birth_date, birth_time, calendar, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }
  if (profile.calendar === "lunar") {
    return NextResponse.json({ error: "음력 사주는 아직 지원하지 않습니다." }, { status: 400 });
  }

  // 캐시 조회 — 이미 결제해서 만든 리포트가 있으면 재생성·재과금 없이 그대로 반환.
  try {
    const { data: cached } = await supabaseAdmin
      .from("premium_wuxing_reports").select("content")
      .eq("saju_profile_id", profile.id).or(notExpiredFilter()).limit(1).maybeSingle();
    if (cached?.content) {
      return NextResponse.json({ report: cached.content, cached: true });
    }
  } catch { /* 테이블 없음(마이그레이션 미적용) → 생성으로 진행 */ }

  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  // 구독자 또는 990원 1회 이용권 보유자만 신규 생성 가능
  const { allowed, passId } = await checkReportAccess(userId, PRODUCT_ID);
  if (!allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=wuxing_one" }, { status: 402 });
  }

  // birth_time은 Postgres time 컬럼이라 이미 초 단위까지 포함된 문자열("HH:MM:SS")로
  // 넘어온다. 여기에 ":00"을 덧붙이면 "...T14:30:00:00"처럼 깨진 ISO 문자열이 되어
  // new Date()가 Invalid Date를 반환하고, 이후 buildChart 내부 계산이 전부 NaN으로
  // 조용히 무너진다(예외 없이 stem/branch가 undefined로 채워짐 — 실제 발생 버그였음).
  // 다른 990원 리포트(yearly/salpuri 등)와 동일하게 그대로 이어붙인다.
  const hasHour = !!profile.birth_time;
  const iso = hasHour ? `${profile.birth_date}T${profile.birth_time}` : `${profile.birth_date}T00:00:00`;
  let chart: ReturnType<typeof buildChart>;
  try {
    chart = buildChart(iso, profile.gender, hasHour);
  } catch (e) {
    // discardAttempt(시도 기록 자체를 삭제)는 "생성 시도로 볼 수 없는 조기 반환"
    // 전용이다(예: 이용권 부족). 사주 계산 실패는 실제 생성 시도가 실패한 것이므로
    // finishAttemptFailed로 error_message를 남겨야 사후 조회(premium_generation_attempts)로
    // 원인 파악이 가능하다 — discardAttempt를 쓰면 증거가 그대로 사라진다(실제 발생 버그).
    // 다른 990원 리포트(yearly 등)와 동일 패턴: 원문 예외는 console.error로만 남기고
    // DB·클라이언트에는 고정된 한국어 메시지만 전달한다(예외 메시지가 영문/내부용일 수 있어서).
    console.error("wuxing [사주 계산 실패]:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 400 });
  }

  let report: Awaited<ReturnType<typeof buildFullReport>>;
  try {
    report = await buildFullReport(chart);
  } catch (e) {
    console.error("wuxing [리포트 조립 실패]:", e);
    await finishAttemptFailed(started.attemptId, e instanceof Error ? e.message : "생성 실패");
    return NextResponse.json({ error: "생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  if (passId) await consumeOneTimePass(passId);
  await finishAttemptDone(started.attemptId);

  // 캐시 저장 (테이블 없으면 무시 — 다음 조회 때 다시 생성되지만 결제는 이미 끝난 뒤라 무료로 재생성됨은 아님)
  try {
    await supabaseAdmin.from("premium_wuxing_reports").upsert(
      { saju_profile_id: profile.id, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
      { onConflict: "saju_profile_id" }
    );
  } catch { /* noop */ }

  return NextResponse.json({ report, cached: false });
}

// DELETE /api/premium/wuxing — 로그인 필수. 사용자가 자기 결과를 직접 삭제.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!profile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("premium_wuxing_reports").delete()
    .eq("saju_profile_id", profile.id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
