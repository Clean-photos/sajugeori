import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkDestinyAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { generateBlueprintReport } from "@/lib/blueprint-engine/generate";

// 운명 설계도 v3.2 — 질문 24개·6블록(판정·근거강도·수치·왜·장면·반증·처방) 구조.
// 판매 진입점(가격·업그레이드 자격)은 기존 그대로(lib/billing/plans.ts,
// app/premium/destiny/page.tsx) 재사용하고, 생성 엔진만 lib/blueprint-engine로
// 교체했다 — 기존 6종 리포트가 쓰는 lib/saju-engine은 건드리지 않는다.
//
// 생성에 LLM 7콜이 순차/병렬로 걸려 실측 약 3분 소요된다(기존 리포트는
// ~40초). Vercel 플랜의 함수 실행 시간 상한이 이보다 짧으면 타임아웃 나므로
// 배포 전 반드시 확인할 것.
export const maxDuration = 280;

const PRODUCT_ID = "destiny_blueprint_one";

// 안전 스위치. 배포는 되어 있어도 이 값이 "true"가 아니면 항상 503 —
// 운영자가 준비됐다고 판단할 때만 Vercel 환경변수로 켠다.
function blueprintEnabled(): boolean {
  return process.env.BLUEPRINT_ENABLED === "true";
}

export async function GET(req: NextRequest) {
  if (!blueprintEnabled()) {
    return NextResponse.json({ error: "not_available", message: "운명 설계도는 아직 준비 중입니다." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/destiny" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  const regenerate = req.nextUrl.searchParams.get("regenerate") === "1";

  if (!regenerate) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("blueprint_reports").select("content")
        .eq("saju_profile_id", profile.id).or(notExpiredFilter()).limit(1).single();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, cached: true });
      }
    } catch { /* 테이블 없음 또는 미저장 → 생성으로 진행 */ }
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

  let report;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}:00`
      : `${profile.birth_date}T00:00:00`;
    report = await generateBlueprintReport(iso, profile.gender ?? "M", !!profile.birth_time);
  } catch (e) {
    console.error("blueprint report error:", e);
    await finishAttemptFailed(started.attemptId, e instanceof Error ? e.message : "생성 오류");
    return NextResponse.json({ error: "생성에 실패했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }

  if (passId) await consumeOneTimePass(passId);
  await finishAttemptDone(started.attemptId);

  try {
    await supabaseAdmin.from("blueprint_reports").upsert(
      {
        saju_profile_id: profile.id, user_id: userId, content: report,
        total_chars: report.meta.totalChars,
        grade_a_ratio: report.meta.gradeTotalCounts ? report.meta.gradeACounts / report.meta.gradeTotalCounts : null,
        expires_at: reportExpiresAtIso(),
      },
      { onConflict: "saju_profile_id" }
    );
  } catch { /* noop */ }

  return NextResponse.json({ report, cached: false });
}
