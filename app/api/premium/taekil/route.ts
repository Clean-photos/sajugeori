import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { checkReportAccess, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed, discardAttempt } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  parseTargetBody, resolveTarget, readAdhocCache, writeAdhocCache,
  ensureOwnProfileId, isoOf,
} from "@/lib/billing/report-target";
import { buildChart, rankDates } from "@/lib/saju-engine";
import type { TaekilPurpose } from "@/lib/saju-engine";
import { generateTaekilReport } from "@/lib/premium/taekil-generate";
import { buildYongsinDualTrack, yongsinDualTrackPromptLine } from "@/lib/premium/yongsin-track";

// 택일 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/taekil-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PURPOSE_LABEL: Record<string, string> = {
  wedding: "결혼식", move: "이사", business: "개업·계약",
  travel: "여행·출발", surgery: "수술·시술", other: "기타",
};

const PRODUCT_ID = "taekil_one";

// POST /api/premium/taekil — 로그인+프리미엄 필수. 등록된 내 사주 + 일진 실계산으로 택일.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 최초 시도 때 저장해 둔
// 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/taekil" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const started = await startAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }
  const input = started.input;

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주로 볼 방법이 없던 원인이었다.
  const parsedTarget = parseTargetBody(input);
  if (!parsedTarget.ok) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: parsedTarget.error }, { status: 400 });
  }
  const target = parsedTarget.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, target);

  const purpose = (input.purpose ?? "other") as TaekilPurpose;
  const from = input.range_from as string;
  const to = input.range_to as string;
  if (!from || !to) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "range_from, range_to are required" }, { status: 400 });
  }

  // 같은 목적·같은 기간 조회면 재생성하지 않는다 (재열람 무료).
  // 대상 사주가 다르면 같은 조건이라도 다른 리포트이므로 variant에 함께 넣는다.
  const variant = [purpose, from, to].join("|");
  const cacheKey = { saju_profile_id: ownProfile?.id ?? "", purpose, range_from: from, range_to: to };
  if (isAdhoc) {
    const cached = await readAdhocCache<{ content: unknown; best: unknown }>(userId, PRODUCT_ID, target, variant);
    if (cached) {
      await discardAttempt(started.attemptId);
      return NextResponse.json({ report: cached.content, best: cached.best ?? [], purpose, range: { from, to }, cached: true, adhoc: true });
    }
  } else if (ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_taekil_reports").select("id, content, best")
        .match(cacheKey).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        await discardAttempt(started.attemptId);
        // §1(CoS 결정 2026-09-08): id를 함께 돌려줘야 마이페이지 "보기 →"가
        // /premium/taekil/{id}(이용권 검사 없는 열람 라우트)로 연결할 수 있다.
        return NextResponse.json({ report: cached.content, best: cached.best ?? [], purpose, range: { from, to }, cached: true, id: cached.id });
      }
    } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }
  }

  // 구독자 또는 990원 단건 이용권 보유자만 통과. 이용권은 생성 성공 후 소진한다.
  const access = await checkReportAccess(userId, PRODUCT_ID);
  if (!access.allowed) {
    await discardAttempt(started.attemptId);
    return NextResponse.json({ error: "premium_required", redirect: "/premium/buy?product=taekil_one" }, { status: 402 });
  }

  // 확정한 대상 사주로 차트 구성 후 일진 스코어링
  let ranked;
  let chart;
  try {
    chart = buildChart(isoOf(target), target.gender, !!target.birthTime);
    ranked = rankDates(chart, from, to, purpose);
  } catch (e) {
    console.error("premium taekil engine error:", e);
    await finishAttemptFailed(started.attemptId, "사주 계산 오류");
    return NextResponse.json({ error: "사주 계산 오류", attemptId: started.attemptId }, { status: 500 });
  }

  const bestLines = ranked.best
    .map((d) => `- ${d.date} (${d.weekday}) ${d.ganji} [점수 ${d.score}]: ${d.notes.join("; ")}`)
    .join("\n");
  const avoidLines = ranked.avoid.length
    ? ranked.avoid.map((d) => `- ${d.date} (${d.weekday}) ${d.ganji}: ${d.notes.join("; ")}`).join("\n")
    : "- 해당 기간 내 뚜렷하게 피해야 할 날(충)은 없음";

  // R1(CoS+CEO 실물 확인, 2026-09-08): ranked.criteria(억부∪조후 합집합, 계산
  // 엔진이 스코어링에 실제로 쓴 값 — 그 자체는 정확하다)를 그대로 "용신"인
  // 것처럼 단정 노출하면 다른 상품과 표기가 갈린다("합집합" 문제로 지적됨).
  // 상품 표준 병기 문구를 덧붙여, 이 리포트도 같은 근거(억부/조후/종합)를
  // 공유하게 한다 — 스코어링 기준(criteria) 설명은 그대로 두되 단정처럼
  // 안 읽히도록 옆에 병기한다.
  const yongsinLine = yongsinDualTrackPromptLine(buildYongsinDualTrack(chart));
  const engineSummary = `
목적: ${PURPOSE_LABEL[purpose] ?? purpose}
조회 기간: ${from} ~ ${to}
택일 기준(점수 산정에 실제로 쓴 기준): ${ranked.criteria.join(" / ")}
${yongsinLine}

[실제 계산한 최길일 후보 — 실제 일진 기준]
${bestLines || "- 조건에 맞는 좋은 날을 찾지 못함"}

[피해야 할 날 — 일지 충]
${avoidLines}`.trim();

  try {
    const report = await generateTaekilReport(engineSummary, PURPOSE_LABEL[purpose] ?? purpose);
    const bestForClient = ranked.best.map((d) => ({ date: d.date, weekday: d.weekday, ganji: d.ganji }));

    // 캐시 저장 (테이블 없으면 무시)
    let savedId: string | null = null;
    if (isAdhoc) {
      // 1회성 — 본인 프로필도, 본인 리포트 캐시도 건드리지 않는다.
      // 이 상품은 content와 best를 함께 돌려주므로 묶어서 캐시한다.
      await writeAdhocCache(userId, PRODUCT_ID, target, { content: report, best: bestForClient }, variant);
    } else {
      // 등록된 사주가 없던 사람이면 이 입력이 본인 프로필로 저장된다(016 규칙).
      const profileId = await ensureOwnProfileId(userId, target, ownProfile);
      if (profileId) {
        try {
          // §1(CoS 결정 2026-09-08): 생성된 행의 id를 돌려줘야 "보기 →"가
          // /premium/taekil/{id}로 연결할 수 있다.
          const { data: inserted } = await supabaseAdmin.from("premium_taekil_reports").insert({
            ...cacheKey, saju_profile_id: profileId, user_id: userId,
            content: report, best: bestForClient, expires_at: reportExpiresAtIso(),
          }).select("id").single();
          savedId = inserted?.id ?? null;
        } catch { /* noop */ }
      }
    }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (access.passId) await consumeOneTimePass(access.passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({
      report,
      best: bestForClient,
      purpose,
      range: ranked.range,
      cached: false,
      id: savedId,
    });
  } catch (e) {
    console.error("premium taekil LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}

/**
 * DELETE /api/premium/taekil — 로그인 필수. §1(CoS 결정 2026-09-08)에서 추가.
 *
 * 이 라우트는 원래 DELETE가 없었다 — TaekilForm의 삭제 버튼이 존재하지도 않는
 * 엔드포인트를 호출하고 있었다(실제로는 항상 실패). premium_taekil_reports는
 * 프로필당 여러 행(목적·기간 조합별)이라 이 행의 PK(id)로 바로 지운다 — species
 * 유무 매칭 같은 되짚기 방식은 본인 사주 재등록으로 saju_profiles 행이 새로
 * 생기면 엉뚱한 행을 건드릴 여지가 있다(pet.ts에서 같은 이유로 이미 id 우선
 * 방식을 도입했다).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await supabaseAdmin.from("premium_taekil_reports").delete().eq("id", body.id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
