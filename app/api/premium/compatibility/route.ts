import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf, timeKeyOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, abortAttempt, acquirePass, runGeneration, failAttempt } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById, deleteByTarget } from "@/lib/premium/report-store";
import { buildChart, mutualAnalysis } from "@/lib/saju-engine";
import { generateCompatibilityReport } from "@/lib/premium/compat-generate";
import { buildCompatPillarSummary } from "@/lib/premium/compat-pillars";

// 궁합 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/compat-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

type Ctx = "romance" | "work" | "friend";

const PRODUCT_ID = "compatibility_one";

// POST /api/premium/compatibility — 로그인+프리미엄 필수. 등록된 내 사주 + 상대 정보로 양방향 궁합.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 새로 보낸 입력값 대신
// 최초 시도 때 저장해 둔 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const user = await requireUser("/premium/compatibility");
  if (!user.ok) return user.response;
  const userId = user.userId;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const began = await beginAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!began.ok) return began.response;
  const { attempt } = began;
  const input = attempt.input;

  // A(첫 번째 사람)는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전에는 별도
  // custom_person_a 체크박스로 받았고 **태어난 시각을 못 받아** 늘 시주 제외로
  // 계산됐다. 이제 다른 상품과 같은 확정 화면을 쓰므로 시각까지 반영된다.
  const parsedA = parseTargetBody(input);
  if (!parsedA.ok) {
    return abortAttempt(attempt, NextResponse.json({ error: parsedA.error }, { status: 400 }));
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
    return abortAttempt(attempt, NextResponse.json({ error: "상대방 태어난 시각 형식을 확인해주세요." }, { status: 400 }));
  }
  const partnerBirthTime = partnerBirthTimeRaw ? timeKeyOf(partnerBirthTimeRaw) : "";
  const partnerGender = (input.partner_gender ?? "F") as "M" | "F";
  const context = (input.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    return abortAttempt(attempt, NextResponse.json({ error: "partner_birth is required" }, { status: 400 }));
  }

  // A가 등록된 본인 사주가 아니면 "임의의 두 사람" 궁합이다(친구 커플·부모님 등).
  const useCustomA = isAdhoc;

  // 같은 두 사람·같은 관계유형 조합이면 재생성하지 않는다 (재열람 무료).
  // A가 본인이 아니면 1회성 캐시를 쓴다 — A의 시각까지 키에 들어가야 하는데
  // 기존 테이블의 person_a_birth에는 날짜만 들어가기 때문이다.
  // §7-1: 상대방 시각이 캐시 키에도 들어가야 "시각을 넣은 재조회"가 "시각
  // 모름" 캐시를 잘못 재사용하지 않는다.
  const variant = [partnerBirth, partnerBirthTime, partnerGender, context].join("|");

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

  // 같은 두 사람·같은 관계유형이면 재생성하지 않는다(재열람 무료). 미사용 이용권이 있으면 findCached가
  // 캐시를 건너뛴다 — 프로모션 이용권이 실제로 쓰이게.
  const key = { userId, productId: PRODUCT_ID, target: personA, ownProfile, isAdhoc, variant };
  const cached = await findCached<{ content?: unknown; text?: string; score: number }>(key);
  if (cached) {
    // 1회성 캐시는 {content, score}, 본인 리포트는 {text, score}로 저장돼 있다.
    // §1(CoS 결정 2026-09-08): 본인 리포트는 id를 함께 돌려줘야 마이페이지 "보기 →"가
    // /premium/compatibility/{id}(이용권 검사 없는 열람 라우트)로 연결할 수 있다.
    return abortAttempt(attempt, NextResponse.json({
      report: cached.adhoc ? cached.content.content : cached.content.text,
      score: cached.content.score, context, cached: true, pillars,
      ...(cached.adhoc ? { adhoc: true } : { id: cached.id }),
    }));
  }

  // 구독자 또는 990원 단건 이용권 보유자만 통과(원자적 선점).
  const pass = await acquirePass(userId, PRODUCT_ID, attempt);
  if (!pass.ok) return pass.response;

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
    return failAttempt(attempt, pass.passId, "사주 계산 오류",
      NextResponse.json({ error: "사주 계산 오류", attemptId: attempt.attemptId }, { status: 500 }));
  }

  return runGeneration({
    label: "compatibility",
    attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateCompatibilityReport(
        mutual, context, normalizedScore,
        useCustomA ? { a: "A", b: "B" } : { a: "나", b: "상대" }
      );
      // 1회성은 {content, score}, 본인 리포트는 {text, score}. 저장 실패 시 1회성 캐시 폴백은 saveReport가 맡는다.
      const savedId = await saveReport(
        key,
        isAdhoc ? { content: report, score: normalizedScore } : { text: report, score: normalizedScore }
      );
      return { report, savedId };
    },
    ok: ({ report, savedId }) =>
      NextResponse.json({ report, score: normalizedScore, context, cached: false, id: savedId, pillars }),
  });
}

// DELETE /api/premium/compatibility — 로그인 필수. 사용자가 특정 상대와의 궁합 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium/compatibility");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const userId = user.userId;

  const body = await req.json().catch(() => ({}));

  // §1(CoS 결정 2026-09-08): /premium/compatibility/[id](저장된 결과 재열람 전용)는 행의 정확한 PK(id)를 안다 —
  // 상대 정보로 되짚으면 본인 사주 재등록으로 프로필이 바뀐 경우 엉뚱한 행을 건드릴 여지가 있다.
  if (typeof body.id === "string" && body.id) return deleteById(userId, PRODUCT_ID, body.id);

  const partnerBirth = body.partner_birth as string;
  const partnerBirthTime = typeof body.partner_birth_time === "string" ? timeKeyOf(body.partner_birth_time) : "";
  const partnerGender = (body.partner_gender ?? "F") as "M" | "F";
  const context = (body.context ?? "romance") as Ctx;
  if (!partnerBirth) {
    return NextResponse.json({ error: "partner_birth is required" }, { status: 400 });
  }

  // A(첫 번째 사람)를 함께 받는다 — 안 받으면 다른 조합의 리포트가 지워진다.
  const parsedA = parseTargetBody(body);
  return deleteByTarget({
    userId, productId: PRODUCT_ID,
    target: parsedA.ok ? parsedA.input : null,
    variant: [partnerBirth, partnerBirthTime, partnerGender, context].join("|"),
  });
}
