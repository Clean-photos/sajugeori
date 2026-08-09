import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkDestinyAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  generateBlueprintReportSteps,
  type BlueprintPartial, type BlueprintPartKey, type BlueprintResumeState,
} from "@/lib/blueprint-engine/generate";
import { AXES } from "@/lib/blueprint-engine/questions";

// 운명 설계도 v3.2 — 질문 24개·6블록(판정·근거강도·수치·왜·장면·반증·처방) 구조.
// 판매 진입점(가격·업그레이드 자격)은 기존 그대로(lib/billing/plans.ts,
// app/premium/destiny/page.tsx) 재사용하고, 생성 엔진만 lib/blueprint-engine로
// 교체했다 — 기존 6종 리포트가 쓰는 lib/saju-engine은 건드리지 않는다.
//
// 187초짜리 단일 요청은 위험하다(탭 이탈 시 결과 유실, 타임아웃 재시도로
// 이중생성) — 축(총론+4개) 단위로 끝나는 대로 즉시 blueprint_reports에
// 부분 저장하고, 실제 생성은 after()로 응답과 분리해서 돌린다. 클라이언트는
// 폴링(GET 반복 호출)으로 진행 상황을 받아본다.
export const maxDuration = 280;

const PRODUCT_ID = "destiny_blueprint_one";
const ALL_PARTS: BlueprintPartKey[] = ["chart", "narrative", "overview", ...AXES.map((a) => `axis_${a.id}` as const)];
// generating 상태로 이 시간 이상 멈춰 있으면 after()가 죽은 것으로 보고 재시도를 허용한다.
const STUCK_AFTER_MS = 6 * 60 * 1000;

function blueprintEnabled(): boolean {
  return process.env.BLUEPRINT_ENABLED === "true";
}

type Row = {
  status: "generating" | "done" | "failed";
  content: BlueprintPartial;
  parts_done: string[];
  parts_failed: string[];
  error_message: string | null;
  regenerate_count: number;
  updated_at: string;
};

function mergePartial(merged: BlueprintPartial, partial: BlueprintPartial): BlueprintPartial {
  const next: BlueprintPartial = { ...merged };
  if (partial.chart) next.chart = partial.chart;
  if (partial.facts) next.facts = partial.facts;
  if (partial.narrative) next.narrative = partial.narrative;
  if (partial.overview) next.overview = partial.overview;
  if (partial.axes) {
    const kept = (next.axes ?? []).filter((a) => !partial.axes!.some((pa) => pa.id === a.id));
    next.axes = [...kept, ...partial.axes];
  }
  if (partial.closing) next.closing = partial.closing;
  if (partial.meta) next.meta = partial.meta;
  return next;
}

/** 실제 생성. after()로 응답과 분리되어 돌기 때문에 클라이언트 연결 여부와 무관하게 끝까지 실행된다. */
async function runGeneration(params: {
  profileId: string; userId: string; attemptId: string | null; passId: string | null;
  birthIso: string; gender: string; hasHour: boolean;
  resume?: BlueprintResumeState; startMerged: BlueprintPartial; startPartsDone: string[];
}) {
  const { profileId, attemptId, passId, birthIso, gender, hasHour, resume, startMerged, startPartsDone } = params;
  let merged = startMerged;
  let partsDone = [...startPartsDone];

  try {
    const report = await generateBlueprintReportSteps(
      birthIso, gender, hasHour,
      async (part, partial) => {
        merged = mergePartial(merged, partial);
        if (!partsDone.includes(part)) partsDone = [...partsDone, part];
        try {
          await supabaseAdmin.from("blueprint_reports").update({
            content: merged, parts_done: partsDone, updated_at: new Date().toISOString(),
          }).eq("saju_profile_id", profileId);
        } catch { /* noop — 다음 파트 저장 때 같이 반영됨 */ }
      },
      resume
    );

    if (passId) await consumeOneTimePass(passId);
    await finishAttemptDone(attemptId);
    await supabaseAdmin.from("blueprint_reports").update({
      status: "done", content: report, parts_done: ALL_PARTS, parts_failed: [], error_message: null,
      total_chars: report.meta.totalChars,
      grade_a_ratio: report.meta.gradeTotalCounts ? report.meta.gradeACounts / report.meta.gradeTotalCounts : null,
      expires_at: reportExpiresAtIso(), updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profileId);
  } catch (e) {
    console.error("blueprint generation error:", e);
    await finishAttemptFailed(attemptId, e instanceof Error ? e.message : "생성 오류");
    const failedParts = ALL_PARTS.filter((p) => !partsDone.includes(p));
    try {
      await supabaseAdmin.from("blueprint_reports").update({
        status: "failed", parts_failed: failedParts,
        error_message: e instanceof Error ? e.message : "생성 오류",
        updated_at: new Date().toISOString(),
      }).eq("saju_profile_id", profileId);
    } catch { /* noop */ }
  }
}

function resumeFrom(content: BlueprintPartial): BlueprintResumeState {
  return { chart: content.chart, facts: content.facts, narrative: content.narrative, overview: content.overview, axes: content.axes };
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

  const wantsRegenerate = req.nextUrl.searchParams.get("regenerate") === "1";
  const wantsRetry = req.nextUrl.searchParams.get("retry") === "1";
  const iso = profile.birth_time ? `${profile.birth_date}T${profile.birth_time}:00` : `${profile.birth_date}T00:00:00`;
  const hasHour = !!profile.birth_time;
  const gender = profile.gender ?? "M";

  const { data: existingRaw } = await supabaseAdmin
    .from("blueprint_reports")
    .select("status, content, parts_done, parts_failed, error_message, regenerate_count, updated_at")
    .eq("saju_profile_id", profile.id).or(notExpiredFilter()).maybeSingle();
  const existing = existingRaw as Row | null;

  // --- 완성본 재생성(건당 1회 제한) ---
  if (wantsRegenerate) {
    if (!existing || existing.status !== "done") {
      return NextResponse.json({ error: "no_report", message: "재생성할 완성된 리포트가 없습니다." }, { status: 400 });
    }
    if (existing.regenerate_count >= 1) {
      return NextResponse.json({ error: "regenerate_limit", message: "재생성은 1회만 가능합니다." }, { status: 409 });
    }
    // startAttempt의 pending 유일성 잠금을 재사용해 동시 더블클릭으로 인한
    // 이중 재생성(이중 과금은 아니지만 이중 원가 지출)을 막는다. 이용권은
    // 이미 소진된 상태이므로 여기서는 접근권 재확인·소진 없이 잠금만 빌린다.
    const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    await supabaseAdmin.from("blueprint_reports").update({
      status: "generating", parts_done: [], parts_failed: [], error_message: null,
      regenerate_count: existing.regenerate_count + 1, updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profile.id);
    after(() => runGeneration({
      profileId: profile.id, userId, attemptId: started.attemptId, passId: null,
      birthIso: iso, gender, hasHour, startMerged: {}, startPartsDone: [],
    }));
    return NextResponse.json({ status: "generating", partsDone: [] });
  }

  // --- 실패 파트 재시도(구매 무효화 아님 — 원자성 로직 재사용, 카운트 없음) ---
  if (wantsRetry) {
    const stuck = existing?.status === "generating" && Date.now() - new Date(existing.updated_at).getTime() > STUCK_AFTER_MS;
    if (!existing || (existing.status !== "failed" && !stuck)) {
      return NextResponse.json({ error: "not_retryable", message: "재시도할 실패한 생성이 없습니다." }, { status: 400 });
    }
    const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    const { allowed, passId } = await checkDestinyAccess(userId);
    if (!allowed) {
      await discardAttempt(started.attemptId);
      return NextResponse.json({ error: "premium_required", redirect: "/premium/menu" }, { status: 402 });
    }
    await supabaseAdmin.from("blueprint_reports").update({
      status: "generating", error_message: null, updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profile.id);
    after(() => runGeneration({
      profileId: profile.id, userId, attemptId: started.attemptId, passId,
      birthIso: iso, gender, hasHour,
      resume: resumeFrom(existing.content), startMerged: existing.content, startPartsDone: existing.parts_done,
    }));
    return NextResponse.json({ status: "generating", partsDone: existing.parts_done });
  }

  // --- 일반 조회/폴링 ---
  if (existing?.status === "done") {
    return NextResponse.json({ status: "done", report: existing.content, regenerateCount: existing.regenerate_count });
  }
  if (existing?.status === "generating") {
    const stuck = Date.now() - new Date(existing.updated_at).getTime() > STUCK_AFTER_MS;
    if (!stuck) {
      return NextResponse.json({ status: "generating", partial: existing.content, partsDone: existing.parts_done });
    }
    // 멈춘 것으로 판단 — failed로 내리고 클라이언트가 retry=1로 재시도하게 한다.
    // premium_generation_attempts에 pending으로 남아있는 잠금도 같이 풀어줘야
    // retry=1의 startAttempt가 "이미 생성 중입니다" 409로 막히지 않는다.
    const failedParts = ALL_PARTS.filter((p) => !existing.parts_done.includes(p));
    await supabaseAdmin.from("blueprint_reports").update({
      status: "failed", parts_failed: failedParts, error_message: "생성이 중단되었습니다.",
      updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profile.id);
    try {
      await supabaseAdmin.from("premium_generation_attempts")
        .update({ status: "failed", error_message: "생성이 중단되었습니다.", updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("product_id", PRODUCT_ID).eq("status", "pending");
    } catch { /* noop */ }
    return NextResponse.json({
      status: "failed", partial: existing.content, partsDone: existing.parts_done, error: "생성이 중단되었습니다.",
    });
  }
  if (existing?.status === "failed") {
    return NextResponse.json({
      status: "failed", partial: existing.content, partsDone: existing.parts_done, error: existing.error_message,
    });
  }

  // --- 최초 생성 시작 ---
  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
  const { allowed, passId } = await checkDestinyAccess(userId);
  if (!allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/menu" }, { status: 402 });
  }

  try {
    await supabaseAdmin.from("blueprint_reports").upsert(
      { saju_profile_id: profile.id, user_id: userId, status: "generating", content: {}, parts_done: [], parts_failed: [] },
      { onConflict: "saju_profile_id" }
    );
  } catch {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "생성을 시작하지 못했습니다." }, { status: 500 });
  }

  after(() => runGeneration({
    profileId: profile.id, userId, attemptId: started.attemptId, passId,
    birthIso: iso, gender, hasHour, startMerged: {}, startPartsDone: [],
  }));

  return NextResponse.json({ status: "generating", partsDone: [] });
}
