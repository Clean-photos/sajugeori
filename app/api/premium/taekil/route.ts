import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, abortAttempt, acquirePass, runGeneration, failAttempt } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById } from "@/lib/premium/report-store";
import { buildChart, rankDates } from "@/lib/saju-engine";
import type { TaekilPurpose } from "@/lib/saju-engine";
import { generateTaekilReport } from "@/lib/premium/taekil-generate";
import { buildYongsinDualTrack, yongsinDualTrackPromptLine } from "@/lib/premium/yongsin-track";
import { buildTaekilCard } from "@/lib/premium/taekil-card";

// 택일 리포트 생성이 병렬 4콜로 나뉘어 있어도(lib/premium/taekil-generate.ts 참고)
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
  const user = await requireUser("/premium/taekil");
  if (!user.ok) return user.response;
  const userId = user.userId;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const began = await beginAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!began.ok) return began.response;
  const { attempt } = began;
  const input = attempt.input;

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주로 볼 방법이 없던 원인이었다.
  const parsedTarget = parseTargetBody(input);
  if (!parsedTarget.ok) {
    return abortAttempt(attempt, NextResponse.json({ error: parsedTarget.error }, { status: 400 }));
  }
  const target = parsedTarget.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, target);

  const purpose = (input.purpose ?? "other") as TaekilPurpose;
  const from = input.range_from as string;
  const to = input.range_to as string;
  if (!from || !to) {
    return abortAttempt(attempt, NextResponse.json({ error: "range_from, range_to are required" }, { status: 400 }));
  }

  // 확정한 대상 사주로 차트 구성 후 일진 스코어링.
  // 2026-09-22(카드 도입): 같은 입력이면 항상 같은 출력(결정적)이라 캐시 히트 때도 이걸 다시 돌려
  // 카드를 만든다 — 저장하지 않고 매번 재계산(오행·살풀이 카드와 동일 원칙). 120일 이내라 비용 미미.
  let ranked;
  let chart;
  try {
    chart = buildChart(isoOf(target), target.gender, !!target.birthTime);
    ranked = rankDates(chart, from, to, purpose);
  } catch (e) {
    console.error("premium taekil engine error:", e);
    return failAttempt(attempt, null, "사주 계산 오류",
      NextResponse.json({ error: "사주 계산 오류", attemptId: attempt.attemptId }, { status: 500 }));
  }
  const card = buildTaekilCard(ranked, PURPOSE_LABEL[purpose] ?? String(purpose));
  const bestForClient = ranked.best.map((d) => ({ date: d.date, weekday: d.weekday, ganji: d.ganji }));

  // 같은 목적·같은 기간 조회면 재생성하지 않는다 (재열람 무료).
  // 대상 사주가 다르면 같은 조건이라도 다른 리포트이므로 variant에 함께 넣는다.
  // 미사용 이용권이 있으면 findCached가 캐시를 건너뛴다(프로모션 이용권이 실제로 쓰이게).
  const variant = [purpose, from, to].join("|");
  const key = { userId, productId: PRODUCT_ID, target, ownProfile, isAdhoc, variant };
  const cached = await findCached<unknown>(key);
  if (cached) {
    // 1회성 캐시는 content와 best를 묶어 저장해 둔다. 본인 리포트는 §1(CoS 결정 2026-09-08)대로 id를 돌려줘야
    // 마이페이지 "보기 →"가 /premium/taekil/{id}로 연결된다.
    const report = cached.adhoc ? (cached.content as { content: unknown }).content : cached.content;
    return abortAttempt(attempt, NextResponse.json({
      report, best: bestForClient, card, purpose, range: { from, to }, cached: true,
      ...(cached.adhoc ? { adhoc: true } : { id: cached.id }),
    }));
  }

  // 구독자 또는 990원 단건 이용권 보유자만 통과(원자적 선점).
  const pass = await acquirePass(userId, PRODUCT_ID, attempt);
  if (!pass.ok) return pass.response;

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

  return runGeneration({
    label: "taekil",
    attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateTaekilReport(engineSummary, PURPOSE_LABEL[purpose] ?? purpose);
      // 1회성은 content와 best를 묶어 캐시한다. 본인 리포트는 문자열 그대로 저장하고 id를 돌려받는다.
      const savedId = await saveReport(
        key,
        isAdhoc ? { content: report, best: bestForClient } : report,
        { purpose, range_from: from, range_to: to }
      );
      return { report, savedId };
    },
    ok: ({ report, savedId }) =>
      NextResponse.json({ report, best: bestForClient, card, purpose, range: ranked.range, cached: false, id: savedId }),
  });
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
  const user = await requireUser("/premium/taekil");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  return deleteById(user.userId, PRODUCT_ID, body.id);
}
