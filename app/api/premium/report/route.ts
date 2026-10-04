import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { hasUnusedPassForRegenerate } from "@/lib/billing/access";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, acquirePass, runGeneration } from "@/lib/premium/pipeline";
import { generateReport } from "@/lib/premium/saju-generate";
import { runSajuEngine } from "@/lib/saju-engine";
import { parseTargetBody, resolveTarget, saveAsOwnProfile } from "@/lib/billing/report-target";

const PRODUCT_ID = "saju_one";

// 사주 풀이 생성이 최대 ~40초 걸리므로 서버리스 타임아웃 상향 (기본 10초로는 부족)
export const maxDuration = 60;

// GET /api/premium/report — 로그인+프리미엄 필수. 캐시 있으면 반환, 없으면 생성.
export async function GET(req: NextRequest) {
  const user = await requireUser("/premium");
  if (!user.ok) return user.response;
  const userId = user.userId;

  // §[다중 사주 우선순위 확정, 2026-10-01, 마이그레이션 021]: is_primary 플래그로 고정.
  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, saju_json")
    .eq("user_id", userId).eq("kind", "person").eq("is_primary", true)
    .single();

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
  //
  // 2026-09-22(CEO 지시, 프로모션 이용권 배포): regenerate=1과 별개로, 지금 쓸 수 있는
  // 미사용 이용권이 있으면 캐시를 건너뛴다 — 안 그러면 새로 받은 이용권을 쓰려 해도
  // "결과 삭제하기"부터 해야 했다. 구독자는 대상이 아니다.
  const skipCacheForPass = await hasUnusedPassForRegenerate(userId, PRODUCT_ID);
  if (!regenerate && !skipCacheForPass) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("reports").select("content")
        .eq("profile_id", profile.id).eq("product_id", PRODUCT_ID).eq("variant", "")
        .or(notExpiredFilter()).limit(1).single();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  // 동시 중복 생성(더블클릭 레이스) 차단 → 이용권 원자적 선점 — 입력은 서버 저장된 profile이라 재입력 걱정은 없다.
  const began = await beginAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!began.ok) return began.response;
  const pass = await acquirePass(userId, PRODUCT_ID, began.attempt);
  if (!pass.ok) return pass.response;

  return runGeneration({
    label: "saju",
    attempt: began.attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateReport(j, profile.birth_date);
      if (!report) throw new Error("빈 응답");
      // 캐시 저장 (테이블 없으면 무시)
      try {
        // QA(2026-09-05) D-2: upsert 충돌 시 created_at DEFAULT가 다시 안 타 재생성해도
        // 생성일이 그대로였다 — 명시적으로 갱신한다.
        await supabaseAdmin.from("reports").upsert(
          { profile_id: profile.id, product_id: PRODUCT_ID, variant: "", user_id: userId, content: report, expires_at: reportExpiresAtIso(), created_at: new Date().toISOString() },
          { onConflict: "profile_id,product_id,variant" }
        );
      } catch { /* noop */ }
      return report;
    },
    ok: (report) => NextResponse.json({ report, day_master: dayMaster, strength, cached: false }),
    failureMessage: "생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    includeAttemptIdOnFailure: false,
  });
}

/**
 * POST /api/premium/report — 화면에서 사주를 직접 입력해 풀이를 받는다.
 * body: { birth_date, birth_time|null, gender, calendar? }
 *
 * 등록된 사주가 없던 사람은 이 입력이 본인 프로필로 저장되고(온보딩과 동일),
 * 이미 등록된 사주가 있는 사람은 프로필을 건드리지 않고 1회성으로 처리한다.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser("/premium");
  if (!user.ok) return user.response;
  const userId = user.userId;

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

  // 2026-09-22(CEO 지시, 프로모션 이용권 배포): 지금 쓸 수 있는 미사용 이용권이 있으면
  // 아래 두 캐시 조회를 모두 건너뛴다 — 안 그러면 새로 받은 이용권을 쓰려 해도
  // "결과 삭제하기"부터 해야 했다. 구독자는 대상이 아니다.
  const skipCacheForPass = await hasUnusedPassForRegenerate(userId, PRODUCT_ID);

  // 1회성인 경우 이미 만들어 둔 같은 조건의 리포트가 있으면 재사용한다(재열람 무료).
  if (!skipCacheForPass && existingProfile?.id) {
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

  // 본인 대상이면 기존 reports 캐시를 먼저 본다(재열람 무료).
  if (!skipCacheForPass && !isAdhoc && ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("reports").select("content")
        .eq("profile_id", ownProfile.id).eq("product_id", PRODUCT_ID).eq("variant", "")
        .or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, day_master: dayMaster, strength, cached: true });
      }
    } catch { /* 테이블 없음 → 생성으로 진행 */ }
  }

  const began = await beginAttempt(userId, PRODUCT_ID, undefined, { birth_date: birthDate, birth_time: timeKey, gender });
  if (!began.ok) return began.response;
  const pass = await acquirePass(userId, PRODUCT_ID, began.attempt);
  if (!pass.ok) return pass.response;

  return runGeneration({
    label: "saju",
    attempt: began.attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateReport(j, birthDate);
      if (!report) throw new Error("빈 응답");

      if (existingProfile?.id) {
        // 1회성 — 본인 프로필은 그대로 두고 별도 캐시에만 저장한다.
        try {
          await supabaseAdmin.from("premium_saju_adhoc_reports").upsert(
            {
              user_id: userId, birth_date: birthDate, birth_time: timeKey, gender,
              content: report, expires_at: reportExpiresAtIso(), created_at: new Date().toISOString(),
            },
            { onConflict: "user_id,birth_date,birth_time,gender" }
          );
        } catch { /* noop */ }
        return { report, adhoc: true as const, savedProfile: false };
      }

      // 본인 대상 — 등록된 사주가 없던 사람이면 이 입력을 본인 프로필로 저장한다(016 규칙).
      const createdId = ownProfile?.id ?? await saveAsOwnProfile(userId, parsed.input, engine);
      if (createdId) {
        try {
          await supabaseAdmin.from("reports").upsert(
            { profile_id: createdId, product_id: PRODUCT_ID, variant: "", user_id: userId, content: report, expires_at: reportExpiresAtIso(), created_at: new Date().toISOString() },
            { onConflict: "profile_id,product_id,variant" }
          );
        } catch { /* noop */ }
      }
      return { report, adhoc: false as const, savedProfile: !ownProfile };
    },
    ok: (r) =>
      NextResponse.json(
        r.adhoc
          ? { report: r.report, day_master: dayMaster, strength, cached: false, adhoc: true }
          : { report: r.report, day_master: dayMaster, strength, cached: false, savedProfile: r.savedProfile }
      ),
    failureMessage: "생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    includeAttemptIdOnFailure: false,
  });
}

// DELETE /api/premium/report — 로그인 필수. 사용자가 자기 프리미엄 사주 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const userId = user.userId;

  // 9차 B: /premium/report/[id](저장본 재열람)는 이 행의 정확한 PK를 안다 — "지금의
  // 본인 프로필"로 되짚지 않는다(다른 사주를 등록했더라도 엉뚱한 행을 건드리지 않는다).
  const body = await req.json().catch(() => ({}));
  if (typeof body.id === "string" && body.id) {
    await supabaseAdmin.from("reports").delete()
      .eq("id", body.id).eq("user_id", userId).eq("product_id", PRODUCT_ID);
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("kind", "person").eq("is_primary", true)
    .single();
  if (!profile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("reports").delete()
    .eq("profile_id", profile.id).eq("product_id", PRODUCT_ID).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}

