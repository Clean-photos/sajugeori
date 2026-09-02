import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  parseTargetBody, resolveTarget, readAdhocCache, writeAdhocCache,
  ensureOwnProfileId, isoOf, timeKeyOf, loadOwnProfile, sameAsProfile,
} from "@/lib/billing/report-target";
import { buildChart, petCompatibility, PET_DEFAULT_MONTH, PET_FLOW_HINT, PET_BRANCH_HINT } from "@/lib/saju-engine";
import type { PetSpecies } from "@/lib/saju-engine";
import { generatePetReport } from "@/lib/premium/pet-generate";

// 펫 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/pet-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "pet_one";

// POST /api/premium/pet — 로그인+프리미엄 필수. 등록된 주인 사주 × 반려동물 궁합.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 최초 시도 때 저장해 둔
// 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/pet" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const started = await startAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }
  const input = started.input;

  // 집사 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주로 볼 방법이 없던 원인이었다.
  const parsedTarget = parseTargetBody(input);
  if (!parsedTarget.ok) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: parsedTarget.error }, { status: 400 });
  }
  const target = parsedTarget.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, target);

  const species: PetSpecies = input.species === "cat" ? "cat" : "dog";
  const petYear = parseInt(String(input.petYear));
  const petMonth = parseInt(String(input.petMonth)) || PET_DEFAULT_MONTH;
  const petDay = input.petDay ? parseInt(String(input.petDay)) : null;
  const petName = String(input.petName ?? "").slice(0, 20).trim() || "아이";
  if (!petYear || petYear < 1980 || petYear > new Date().getFullYear()) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "반려동물 출생 연도를 확인해주세요." }, { status: 400 });
  }

  let facts;
  try {
    const owner = buildChart(isoOf(target), target.gender, !!target.birthTime);
    facts = petCompatibility(owner, { species, petYear, petMonth, petDay, petName });
  } catch (e) {
    console.error("premium pet engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  // 같은 아이·같은 조건이면 재생성하지 않는다. 캐시 키의 pet_day는 0이 '모름'.
  // 집사 사주가 다르면 같은 아이라도 다른 리포트이므로 variant에 함께 넣는다.
  const variant = [species, petName, petYear, petMonth, petDay ?? 0].join("|");
  const cacheKey = {
    saju_profile_id: ownProfile?.id ?? "",
    species,
    pet_name: petName,
    pet_year: petYear,
    pet_month: petMonth,
    pet_day: petDay ?? 0,
  };
  if (isAdhoc) {
    const cached = await readAdhocCache(userId, PRODUCT_ID, target, variant);
    if (cached) {
      await discardAttempt(started.attemptId);
      return NextResponse.json({ report: cached, pet: facts.pet, petName, cached: true, adhoc: true });
    }
  } else if (ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_pet_reports").select("content")
        .match(cacheKey).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        await discardAttempt(started.attemptId);
        return NextResponse.json({ report: cached.content, pet: facts.pet, petName, cached: true });
      }
    } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }
  }

  // 캐시가 없을 때만 구독 확인 (이미 본 결과는 재열람 허용)
  // 구독자 또는 990원 단건 이용권 보유자만 통과. 이용권은 생성 성공 후 소진한다.
  const access = await checkReportAccess(userId, PRODUCT_ID);
  if (!access.allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=pet_one" }, { status: 402 });
  }

  try {
    const report = await generatePetReport(facts, petName, PET_BRANCH_HINT, PET_FLOW_HINT);
    // 캐시 저장 (테이블 없으면 무시)
    if (isAdhoc) {
      // 1회성 — 본인 프로필도, 본인 리포트 캐시도 건드리지 않는다.
      await writeAdhocCache(userId, PRODUCT_ID, target, report, variant);
    } else {
      // 등록된 사주가 없던 사람이면 이 입력이 본인 프로필로 저장된다(016 규칙).
      const profileId = await ensureOwnProfileId(userId, target, ownProfile);
      if (profileId) {
        try {
          await supabaseAdmin.from("premium_pet_reports").upsert(
            { ...cacheKey, saju_profile_id: profileId, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
            { onConflict: "saju_profile_id,species,pet_name,pet_year,pet_month,pet_day" }
          );
        } catch { /* noop */ }
      }
    }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (access.passId) await consumeOneTimePass(access.passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({ report, pet: facts.pet, petName, cached: false });
  } catch (e) {
    console.error("premium pet LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}

// DELETE /api/premium/pet — 로그인 필수. 사용자가 특정 반려동물의 궁합 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const species: PetSpecies = body.species === "cat" ? "cat" : "dog";
  const petYear = parseInt(String(body.petYear));
  const petMonth = parseInt(String(body.petMonth)) || PET_DEFAULT_MONTH;
  const petDay = body.petDay ? parseInt(String(body.petDay)) : null;
  const petName = String(body.petName ?? "").slice(0, 20).trim() || "아이";
  if (!petYear) {
    return NextResponse.json({ error: "petYear is required" }, { status: 400 });
  }

  // 대상(집사 사주)을 함께 받는다 — 안 받으면 가족 사주로 만든 리포트를 지우려다
  // 본인 리포트가 지워진다.
  const parsedTarget = parseTargetBody(body);
  const ownProfile = await loadOwnProfile(userId);

  if (parsedTarget.ok && ownProfile && !sameAsProfile(parsedTarget.input, ownProfile)) {
    const t = parsedTarget.input;
    await supabaseAdmin.from("premium_adhoc_reports").delete()
      .eq("user_id", userId).eq("product_id", PRODUCT_ID)
      .eq("birth_date", t.birthDate).eq("birth_time", timeKeyOf(t.birthTime))
      .eq("gender", t.gender)
      .eq("variant", [species, petName, petYear, petMonth, petDay ?? 0].join("|"));
    return NextResponse.json({ ok: true });
  }

  if (!ownProfile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("premium_pet_reports").delete()
    .eq("saju_profile_id", ownProfile.id).eq("user_id", userId)
    .eq("species", species).eq("pet_name", petName)
    .eq("pet_year", petYear).eq("pet_month", petMonth).eq("pet_day", petDay ?? 0);

  return NextResponse.json({ ok: true });
}
