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
import { buildChart, mutualAnalysis } from "@/lib/saju-engine";
import { generateCompatibilityReport } from "@/lib/premium/compat-generate";
import { buildCompatPillarSummary } from "@/lib/premium/compat-pillars";

// 궁합 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/compat-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const CONTEXT_LABEL: Record<string, string> = {
  romance: "연애·결혼", work: "직장·비즈니스", friend: "친구·지인",
};

type Ctx = "romance" | "work" | "friend";

const PRODUCT_ID = "compatibility_one";

// POST /api/premium/compatibility — 로그인+프리미엄 필수. 등록된 내 사주 + 상대 정보로 양방향 궁합.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 새로 보낸 입력값 대신
// 최초 시도 때 저장해 둔 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/compatibility" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const started = await startAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }
  const input = started.input;

  // A(첫 번째 사람)는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전에는 별도
  // custom_person_a 체크박스로 받았고 **태어난 시각을 못 받아** 늘 시주 제외로
  // 계산됐다. 이제 다른 상품과 같은 확정 화면을 쓰므로 시각까지 반영된다.
  const parsedA = parseTargetBody(input);
  if (!parsedA.ok) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: parsedA.error }, { status: 400 });
  }
  const personA = parsedA.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, personA);

  // §7-1(CoS+CEO 실물 확인, 2026-09-08): 상대방 입력에 태어난 시각이 아예
  // 없어 모든 상대가 시주 제외로 계산됐다. 화면(CompatForm)이 이제 시각(선택)
  // 을 함께 보내고, 음력이면 이미 양력으로 변환해서 보낸다(다른 상품과 같은
  // 규칙 — 서버는 항상 양력만 받는다).
  const partnerBirth = input.partner_birth as string;
  const partnerBirthTimeRaw = typeof input.partner_birth_time === "string" && input.partner_birth_time ? input.partner_birth_time : null;
  if (partnerBirthTimeRaw !== null && !/^\d{2}:\d{2}(:\d{2})?$/.test(partnerBirthTimeRaw)) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "상대방 태어난 시각 형식을 확인해주세요." }, { status: 400 });
  }
  const partnerBirthTime = partnerBirthTimeRaw ? timeKeyOf(partnerBirthTimeRaw) : "";
  const partnerGender = (input.partner_gender ?? "F") as "M" | "F";
  const context = (input.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "partner_birth is required" }, { status: 400 });
  }

  // A가 등록된 본인 사주가 아니면 "임의의 두 사람" 궁합이다(친구 커플·부모님 등).
  const useCustomA = isAdhoc;

  // 같은 두 사람·같은 관계유형 조합이면 재생성하지 않는다 (재열람 무료).
  // A가 본인이 아니면 1회성 캐시를 쓴다 — A의 시각까지 키에 들어가야 하는데
  // 기존 테이블의 person_a_birth에는 날짜만 들어가기 때문이다.
  // §7-1: 상대방 시각이 캐시 키에도 들어가야 "시각을 넣은 재조회"가 "시각
  // 모름" 캐시를 잘못 재사용하지 않는다.
  const variant = [partnerBirth, partnerBirthTime, partnerGender, context].join("|");
  const cacheKey = {
    saju_profile_id: ownProfile?.id ?? "",
    person_a_birth: personA.birthDate, person_a_gender: personA.gender,
    partner_birth: partnerBirth, partner_birth_time: partnerBirthTime, partner_gender: partnerGender, context,
  };

  // §7-3(CoS 실물 재검증, 2026-09-10): 두 사람의 명식표를 응답에 함께 실어
  // 화면이 바로 그릴 수 있게 한다 — 캐시 히트든 새 생성이든 항상 같은 함수로
  // 다시 뽑는다(저장은 안 함, 비용 0 — §0-2①/②와 같은 이유). 실패해도 리포트
  // 자체는 정상 응답해야 하니 실패를 삼킨다.
  const personALabel = useCustomA ? "A" : "나";
  const partnerLabel = useCustomA ? "B" : "상대";
  let pillars: { a: ReturnType<typeof buildCompatPillarSummary>; b: ReturnType<typeof buildCompatPillarSummary> } | null = null;
  try {
    const meChart = buildChart(isoOf(personA), personA.gender, !!personA.birthTime);
    const otherChart = buildChart(`${partnerBirth}T${partnerBirthTime || "00:00"}:00`, partnerGender, !!partnerBirthTime);
    pillars = { a: buildCompatPillarSummary(meChart, personALabel), b: buildCompatPillarSummary(otherChart, partnerLabel) };
  } catch { /* 명식표는 부가 정보 — 실패해도 리포트 생성은 계속한다 */ }

  if (isAdhoc) {
    const cached = await readAdhocCache<{ content: unknown; score: number }>(userId, PRODUCT_ID, personA, variant);
    if (cached) {
      await discardAttempt(started.attemptId);
      return NextResponse.json({ report: cached.content, score: cached.score, context, cached: true, adhoc: true, pillars });
    }
  } else if (ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_compatibility_reports").select("id, content, score")
        .match(cacheKey).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        await discardAttempt(started.attemptId);
        // §1(CoS 결정 2026-09-08): id를 함께 돌려줘야 마이페이지 "보기 →"가
        // /premium/compatibility/{id}(이용권 검사 없는 열람 라우트)로 연결할 수 있다.
        return NextResponse.json({ report: cached.content, score: cached.score, context, cached: true, id: cached.id, pillars });
      }
    } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }
  }

  // 구독자 또는 990원 단건 이용권 보유자만 통과. 이용권은 생성 성공 후 소진한다.
  const access = await checkReportAccess(userId, PRODUCT_ID);
  if (!access.allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=compatibility_one" }, { status: 402 });
  }

  // A 사주(등록된 내 사주 또는 직접 입력한 임의의 사람) + 상대 사주 재구성 후 양방향 분석.
  let mutual;
  let normalizedScore = 50;
  try {
    const me = buildChart(isoOf(personA), personA.gender, !!personA.birthTime);
    const other = buildChart(`${partnerBirth}T${partnerBirthTime || "00:00"}:00`, partnerGender, !!partnerBirthTime);
    mutual = mutualAnalysis(me, other, personALabel, partnerLabel, context);
    normalizedScore = Math.min(100, Math.max(0, Math.round(38 + mutual.combinedScore * 6)));
  } catch (e) {
    console.error("premium compatibility engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  try {
    const report = await generateCompatibilityReport(
      mutual, context, normalizedScore,
      useCustomA ? { a: "A", b: "B" } : { a: "나", b: "상대" }
    );

    // 캐시 저장 (테이블 없으면 무시)
    let savedId: string | null = null;
    if (isAdhoc) {
      // 1회성 — 본인 프로필도, 본인 리포트 캐시도 건드리지 않는다.
      await writeAdhocCache(userId, PRODUCT_ID, personA, { content: report, score: normalizedScore }, variant);
    } else {
      // 등록된 사주가 없던 사람이면 이 입력이 본인 프로필로 저장된다(016 규칙).
      const profileId = await ensureOwnProfileId(userId, personA, ownProfile);
      if (profileId) {
        const row = {
          ...cacheKey, saju_profile_id: profileId, user_id: userId,
          content: report, score: normalizedScore, expires_at: reportExpiresAtIso(),
        };
        try {
          // §1(CoS 결정 2026-09-08): 생성된 행의 id를 돌려줘야 "보기 →"가
          // /premium/compatibility/{id}로 연결할 수 있다.
          const { data: inserted } = await supabaseAdmin.from("premium_compatibility_reports").insert(row).select("id").single();
          savedId = inserted?.id ?? null;
        } catch (e) {
          // §7-1 재검증(2026-09-13 실물 확인): 마이그레이션 020(partner_birth_time
          // 컬럼 추가)이 아직 미적용 상태라 이 insert가 그 컬럼 때문에 통째로
          // 실패했다 — 리포트는 화면에 정상 표시됐지만 DB엔 저장되지 않아,
          // 실제 990원 결제 고객이 탭을 닫으면 다시는 못 보는 사고로 이어질 수
          // 있다(실측: 코드 배포 후 첫 궁합 생성이 그대로 유실됨). 마이그레이션
          // 적용 전까지는 그 컬럼 없이라도 저장해 "리포트 자체가 사라지는"
          // 최악은 막는다 — 시각 기반 캐시 재사용 정밀도만 낮아진다.
          console.error("궁합 저장 1차 실패(partner_birth_time 컬럼 미적용 추정), 그 필드 빼고 재시도:", e);
          try {
            const { partner_birth_time: _drop, ...rowWithoutTime } = row;
            void _drop;
            const { data: inserted } = await supabaseAdmin.from("premium_compatibility_reports").insert(rowWithoutTime).select("id").single();
            savedId = inserted?.id ?? null;
          } catch (e2) {
            console.error("궁합 저장 2차 실패, 캐시 없이 리포트만 반환:", e2);
          }
        }
      }
    }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (access.passId) await consumeOneTimePass(access.passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({ report, score: normalizedScore, context, cached: false, id: savedId, pillars });
  } catch (e) {
    console.error("premium compatibility LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}

// DELETE /api/premium/compatibility — 로그인 필수. 사용자가 특정 상대와의 궁합 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));

  // §1(CoS 결정 2026-09-08): /premium/compatibility/[id](저장된 결과 재열람
  // 전용, 이용권 검사 없음)는 이 행의 정확한 PK(id)를 이미 알고 있다 — 상대
  // 정보로 되짚어 찾는 아래 기존 방식과 달리 본인 사주 재등록으로 프로필이
  // 바뀌어도 엉뚱한 행을 건드릴 여지가 없다(pet.ts와 동일한 이유).
  if (typeof body.id === "string" && body.id) {
    await supabaseAdmin.from("premium_compatibility_reports").delete().eq("id", body.id).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  }

  const partnerBirth = body.partner_birth as string;
  const partnerBirthTime = typeof body.partner_birth_time === "string" ? timeKeyOf(body.partner_birth_time) : "";
  const partnerGender = (body.partner_gender ?? "F") as "M" | "F";
  const context = (body.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    return NextResponse.json({ error: "partner_birth is required" }, { status: 400 });
  }

  // A(첫 번째 사람)를 함께 받는다 — 안 받으면 다른 조합의 리포트가 지워진다.
  const parsedA = parseTargetBody(body);
  const ownProfile = await loadOwnProfile(userId);

  if (parsedA.ok && ownProfile && !sameAsProfile(parsedA.input, ownProfile)) {
    const a = parsedA.input;
    await supabaseAdmin.from("premium_adhoc_reports").delete()
      .eq("user_id", userId).eq("product_id", PRODUCT_ID)
      .eq("birth_date", a.birthDate).eq("birth_time", timeKeyOf(a.birthTime))
      .eq("gender", a.gender)
      .eq("variant", [partnerBirth, partnerBirthTime, partnerGender, context].join("|"));
    return NextResponse.json({ ok: true });
  }

  if (!ownProfile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("premium_compatibility_reports").delete()
    .eq("saju_profile_id", ownProfile.id).eq("user_id", userId)
    .eq("person_a_birth", ownProfile.birth_date).eq("person_a_gender", ownProfile.gender)
    .eq("partner_birth", partnerBirth).eq("partner_birth_time", partnerBirthTime)
    .eq("partner_gender", partnerGender).eq("context", context);

  return NextResponse.json({ ok: true });
}
