import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf, timeKeyOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, acquirePass, runGeneration } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById, deleteByTarget } from "@/lib/premium/report-store";
import { buildChart, scoreYear } from "@/lib/saju-engine";
import { generateYearlyReport } from "@/lib/premium/yearly-generate";
import { buildYearlyCard } from "@/lib/premium/yearly-card";
import { kstYear } from "@/lib/time/kst";

// 생성이 여러 병렬 LLM 호출로 나뉘어 있어도(lib/premium/yearly-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "yearly_one";

// POST /api/premium/yearly — 로그인 필수. 캐시 → (구독자 또는 990원 단건 이용권) → 생성.
export async function POST(req: NextRequest) {
  const user = await requireUser("/premium/yearly");
  if (!user.ok) return user.response;
  const userId = user.userId;

  const body = await req.json().catch(() => ({}));
  const year = parseInt(body.year) || kstYear();

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주를 볼 방법이 없던 원인이었다.
  const parsed = parseTargetBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);
  // 같은 대상이라도 연도가 다르면 다른 리포트다.
  const key = { userId, productId: PRODUCT_ID, target: input, ownProfile, isAdhoc, variant: String(year) };

  // 확정한 대상 사주로 차트 구성 후 세운·월운 스코어링.
  // 2026-09-22(카드 도입): 같은 입력이면 항상 같은 출력(결정적)이라 캐시 히트 때도 이걸 다시 돌려
  // 카드를 만든다 — 저장하지 않고 매번 재계산(오행·살풀이 카드와 동일 원칙).
  let yr;
  let chart;
  try {
    chart = buildChart(isoOf(input), input.gender, !!input.birthTime);
    yr = scoreYear(chart, year);
  } catch (e) {
    console.error("premium yearly engine error:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }
  const card = buildYearlyCard(yr);

  // 캐시를 게이트보다 먼저 본다 — 이미 결제해 만든 리포트는 이용권이 소진된 뒤에도 다시 열려야 한다.
  // (예전엔 이 라우트만 게이트를 먼저 걸어 이용권을 쓴 사용자가 자기 결과를 다시 못 열었다.)
  const cached = await findCached<string>(key);
  if (cached) {
    return NextResponse.json({ report: cached.content, year, card, cached: true, ...(cached.adhoc ? { adhoc: true } : {}) });
  }

  // 동시 중복 생성(더블클릭 레이스) 차단 → 이용권 원자적 선점(실패 시 시도 기록 삭제 + 402)
  const began = await beginAttempt(userId, PRODUCT_ID, undefined, {
    birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime), gender: input.gender, year,
  });
  if (!began.ok) return began.response;
  const pass = await acquirePass(userId, PRODUCT_ID, began.attempt);
  if (!pass.ok) return pass.response;

  return runGeneration({
    label: "yearly",
    attempt: began.attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateYearlyReport(yr, year, chart);
      await saveReport(key, report, { year });
      return report;
    },
    ok: (report) => NextResponse.json({ report, year, card, cached: false }),
  });
}

/**
 * DELETE /api/premium/yearly — 로그인 필수. 사용자가 자기 연운세 결과(연도별)를 직접 삭제.
 * body: { id } 또는 { year, birth_date, birth_time|null, gender } — 지금 화면에 띄운 리포트의 대상.
 * 대상을 받지 않으면 가족 리포트를 지우려다 본인 리포트가 지워진다.
 */
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium/yearly");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.id === "string" && body.id) return deleteById(user.userId, PRODUCT_ID, body.id);

  const parsed = parseTargetBody(body);
  return deleteByTarget({
    userId: user.userId, productId: PRODUCT_ID,
    target: parsed.ok ? parsed.input : null,
    variant: String(parseInt(body.year) || kstYear()),
  });
}
