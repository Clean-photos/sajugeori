import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkDestinyAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { parseTargetBody, resolveTarget, ensureTargetProfileId, isoOf, loadOwnProfile } from "@/lib/billing/report-target";
import { runBlueprintStep, type BlueprintPartial, type BlueprintResumeState } from "@/lib/blueprint-engine/generate";

// 운명 설계도 v3.2 — 질문 24개·6블록(판정·근거강도·수치·왜·장면·반증·처방) 구조.
// 판매 진입점(가격·업그레이드 자격)은 기존 그대로(lib/billing/plans.ts,
// app/premium/destiny/page.tsx) 재사용하고, 생성 엔진만 lib/blueprint-engine로
// 교체했다 — 기존 6종 리포트가 쓰는 lib/saju-engine은 건드리지 않는다.
//
// Vercel 플랜이 Hobby라 함수 실행시간이 60초로 묶여 있다(after()로 응답과
// 분리해도 같은 제한을 받는다). 그래서 전체를 한 번에 생성하지 않고,
// 폴링(GET) 한 번당 "스텝 하나"(총론 또는 축 하나 등)만 진행하고 즉시
// 부분 저장 후 응답한다. 탭을 닫아도 이미 만든 부분은 DB에 남고, 다시
// 열면 그 다음 스텝부터 이어진다 — 별도 백그라운드 작업이 없으므로
// "멈춰서 안 끝나는" 상태 자체가 생기지 않는다.
export const maxDuration = 60;

const PRODUCT_ID = "destiny_blueprint_one";

function blueprintEnabled(): boolean {
  return process.env.BLUEPRINT_ENABLED === "true";
}

type Row = {
  status: "generating" | "done" | "failed";
  content: BlueprintPartial;
  parts_done: string[];
  error_message: string | null;
  attempt_id: string | null;
  pass_id: string | null;
  regenerate_count: number;
};

function resumeFrom(content: BlueprintPartial): BlueprintResumeState {
  return { chart: content.chart, facts: content.facts, narrative: content.narrative, overview: content.overview, axes: content.axes };
}

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

/** 스텝 하나를 실행하고 그 결과를 DB에 반영한 뒤 클라이언트 응답을 만든다. */
async function runOneStep(params: {
  profileId: string; attemptId: string | null; passId: string | null;
  iso: string; gender: string; hasHour: boolean;
  merged: BlueprintPartial; partsDone: string[]; regenerateCount: number;
}) {
  const { profileId, attemptId, passId, iso, gender, hasHour, merged, partsDone, regenerateCount } = params;
  try {
    const result = await runBlueprintStep(resumeFrom(merged), iso, gender, hasHour);
    const nextMerged = mergePartial(merged, result.partial);
    const nextPartsDone = partsDone.includes(result.part) ? partsDone : [...partsDone, result.part];

    if (result.isFinal && result.report) {
      if (passId) await consumeOneTimePass(passId);
      await finishAttemptDone(attemptId);
      await supabaseAdmin.from("blueprint_reports").update({
        status: "done", content: result.report, parts_done: nextPartsDone, error_message: null,
        pass_id: null,
        total_chars: result.report.meta.totalChars,
        grade_a_ratio: result.report.meta.gradeTotalCounts ? result.report.meta.gradeACounts / result.report.meta.gradeTotalCounts : null,
        expires_at: reportExpiresAtIso(), updated_at: new Date().toISOString(),
      }).eq("saju_profile_id", profileId);
      return NextResponse.json({ status: "done", report: result.report, regenerateCount });
    }

    await supabaseAdmin.from("blueprint_reports").update({
      content: nextMerged, parts_done: nextPartsDone, updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profileId);
    return NextResponse.json({ status: "generating", partial: nextMerged, partsDone: nextPartsDone });
  } catch (e) {
    console.error("blueprint step error:", e);
    await finishAttemptFailed(attemptId, e instanceof Error ? e.message : "생성 오류");
    await supabaseAdmin.from("blueprint_reports").update({
      status: "failed", error_message: e instanceof Error ? e.message : "생성 오류", updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profileId);
    return NextResponse.json({
      status: "failed", partial: merged, partsDone, error: e instanceof Error ? e.message : "생성 오류",
    });
  }
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

  // 대상 사주는 화면에서 확정해 쿼리로 보낸다(생성 직전 컨펌). 폴링마다 같은 값이
  // 와야 하므로 body가 아니라 쿼리 파라미터로 받는다.
  const q = req.nextUrl.searchParams;
  const parsed = parseTargetBody({
    birth_date: q.get("birth_date"), birth_time: q.get("birth_time"), gender: q.get("gender"),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }
  const input = parsed.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);

  // 이 상품은 진행 상태(status/parts_done/attempt_id)를 saju_profile_id로 들고 있어
  // 1회성 캐시 테이블로는 옮길 수 없다. 대상마다 프로필 행을 확보해 상태 머신을
  // 그대로 쓴다(자세한 사유는 ensureTargetProfileId 주석 참고).
  const profileId = await ensureTargetProfileId(userId, input, ownProfile, isAdhoc);
  if (!profileId) {
    return NextResponse.json({ error: "사주 정보를 준비하지 못했습니다." }, { status: 500 });
  }
  const profile = { id: profileId };

  const wantsRegenerate = q.get("regenerate") === "1";
  const iso = isoOf(input);
  const hasHour = !!input.birthTime;
  const gender = input.gender;

  const { data: existingRaw } = await supabaseAdmin
    .from("blueprint_reports")
    .select("status, content, parts_done, error_message, attempt_id, pass_id, regenerate_count")
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
      status: "generating", content: {}, parts_done: [], error_message: null,
      attempt_id: started.attemptId, pass_id: null,
      regenerate_count: existing.regenerate_count + 1, updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profile.id);
    return await runOneStep({
      profileId: profile.id, attemptId: started.attemptId, passId: null,
      iso, gender, hasHour, merged: {}, partsDone: [], regenerateCount: existing.regenerate_count + 1,
    });
  }

  // --- 완성본 조회 ---
  if (existing?.status === "done") {
    return NextResponse.json({ status: "done", report: existing.content, regenerateCount: existing.regenerate_count });
  }

  // --- 실패했던 시도 이어가기: 접근권을 다시 확인하고 같은 attempt를 pending으로 되돌린다 ---
  if (existing?.status === "failed") {
    const started = await startAttempt(userId, PRODUCT_ID, existing.attempt_id ?? undefined, { saju_profile_id: profile.id });
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    let passId = existing.pass_id;
    if (!passId) {
      const access = await checkDestinyAccess(userId);
      if (!access.allowed) {
        await discardAttempt(started.attemptId);
        return NextResponse.json({ error: "premium_required", redirect: "/premium/menu" }, { status: 402 });
      }
      passId = access.passId;
    }
    await supabaseAdmin.from("blueprint_reports").update({
      status: "generating", error_message: null, attempt_id: started.attemptId, pass_id: passId, updated_at: new Date().toISOString(),
    }).eq("saju_profile_id", profile.id);
    return await runOneStep({
      profileId: profile.id, attemptId: started.attemptId, passId,
      iso, gender, hasHour, merged: existing.content, partsDone: existing.parts_done, regenerateCount: existing.regenerate_count,
    });
  }

  // --- 진행 중인 생성 이어가기(폴링) ---
  if (existing?.status === "generating") {
    return await runOneStep({
      profileId: profile.id, attemptId: existing.attempt_id, passId: existing.pass_id,
      iso, gender, hasHour, merged: existing.content, partsDone: existing.parts_done, regenerateCount: existing.regenerate_count,
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
      {
        saju_profile_id: profile.id, user_id: userId, status: "generating", content: {}, parts_done: [],
        attempt_id: started.attemptId, pass_id: passId,
      },
      { onConflict: "saju_profile_id" }
    );
  } catch {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "생성을 시작하지 못했습니다." }, { status: 500 });
  }

  return await runOneStep({
    profileId: profile.id, attemptId: started.attemptId, passId,
    iso, gender, hasHour, merged: {}, partsDone: [], regenerateCount: 0,
  });
}

// DELETE /api/premium/destiny — 로그인 필수. 사용자가 자기 운명 설계도 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  // 대상을 함께 받는다 — 안 받으면 가족 사주로 만든 설계도를 지우려다 본인 것이 지워진다.
  const q = req.nextUrl.searchParams;
  const parsed = parseTargetBody({
    birth_date: q.get("birth_date"), birth_time: q.get("birth_time"), gender: q.get("gender"),
  });

  let profileId: string | null = null;
  if (parsed.ok) {
    const { ownProfile, isAdhoc } = await resolveTarget(userId, parsed.input);
    // 여기서는 없는 프로필을 새로 만들지 않는다(삭제인데 행을 만들 이유가 없다).
    profileId = isAdhoc ? null : ownProfile?.id ?? null;
    if (isAdhoc) {
      const { data } = await supabaseAdmin
        .from("saju_profiles").select("id")
        .eq("user_id", userId).eq("label", "대상")
        .eq("birth_date", parsed.input.birthDate).eq("gender", parsed.input.gender)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      profileId = data?.id ?? null;
    }
  } else {
    profileId = (await loadOwnProfile(userId))?.id ?? null;
  }

  if (!profileId) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("blueprint_reports").delete()
    .eq("saju_profile_id", profileId).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
