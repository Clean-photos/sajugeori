import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf, timeKeyOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, acquirePass, runGeneration } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById, deleteByTarget } from "@/lib/premium/report-store";
import { buildChart } from "@/lib/saju-engine";
import { classify } from "@/lib/wuxing/classify";
import { buildDiagnosis } from "@/lib/wuxing/diagnosis";
import { generateDiagnosisNarrative } from "@/lib/wuxing/diagnosis-narrative";
import { buildSeunPrescription } from "@/lib/wuxing/seun-prescription";
import { generateSeunNarrative } from "@/lib/wuxing/seun-narrative";
import { buildWuxingReport, type WuxingNarratives, type WuxingReportData } from "@/lib/wuxing/report";

// LLM 호출 2곳(§① 보충 문장·§⑥ 흐름 문단)이 병렬이라 개별 실측(6~14초)보다 여유 있게 잡는다.
// 실측(2026-08-31, claude-sonnet-5): 평균 9.2초, 최대 12.0초 — 60초 상한에 여유 충분.
export const maxDuration = 60;

const PRODUCT_ID = "wuxing_one";

/**
 * ⚠️ §13 작업 규칙: "개발은 진행하되 판매 노출 시점은 별도 지시". §10-9(결제 연결)로
 * checkReportAccess/consumeOneTimePass 정식 게이트를 붙였지만, WUXING_ENABLED
 * 플래그는 CEO 판단(2026-08-31)에 따라 **운영 킬스위치로 유지**한다 — 이유:
 *   ① 토스 카드사 심사가 아직 진행 중이라, 심사 완료 전까지는 실제 결제 버튼이
 *      뜨는 시점 자체를 코드 배포와 분리해 둘 필요가 있다
 *   ② 결제 게이트가 정상 작동해도, 생성 로직 버그가 나중에 발견되면 재배포 없이
 *      즉시 끌 수 있는 수단이 하나 더 있는 편이 안전하다(다른 990원 리포트에는
 *      없는 이중 안전장치이지만, 신규 상품 초기 안정화 기간에는 정당하다)
 * 값이 "1"이 아니면 로그인·결제 여부와 무관하게 404. Vercel에는 아직 미설정이라
 * 이번 배포로도 프로덕션은 비활성 상태 그대로다. 결제·노출 시점이 되면 CEO가
 * Vercel 환경변수만 켜면 된다(코드 변경 불필요).
 */
function isEnabled(): boolean {
  return process.env.WUXING_ENABLED === "1";
}

/**
 * §2(CoS 실물 재검증, 2026-09-11): 오행은 "다시 생성" 버튼이 없다(U2) — 이
 * 두 LLM 호출 중 하나가 실패하면(대부분 validateSeunNarrative 같은 규칙
 * 위반 재시도 없이 그대로 폴백 문구로 굳어버리고, 사용자가 되돌릴 방법이
 * 없다("3년을 관통하는 흐름을 준비하고 있습니다"가 영구 고정 — 실측).
 * 실패 원인이 네트워크든 규칙 위반이든 한 번 더 시도하면 상당수는
 * 통과하므로, 실패 시 1회만 재시도한다.
 */
async function withRetryOnce<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`wuxing [${label}] 1차 실패, 재시도:`, e);
    return await fn();
  }
}

async function buildFullReport(chart: ReturnType<typeof buildChart>) {
  const cls = classify(chart);
  const diagnosis = buildDiagnosis(chart, cls);
  const seunPlan = buildSeunPrescription(chart, cls);

  // 서로 무관한 입력이라 병렬로 돌린다. 하나가 실패해도 나머지는 살리고,
  // 실패한 자리는 컴포넌트의 "준비하고 있습니다" 폴백이 자체 처리한다.
  const [diagnosisResult, seunFlowResult] = await Promise.allSettled([
    withRetryOnce(() => generateDiagnosisNarrative(diagnosis), "한 줄 진단 보충 문장"),
    withRetryOnce(() => generateSeunNarrative(chart, cls, seunPlan), "3년 흐름 문단"),
  ]);

  const narratives: WuxingNarratives = {};
  if (diagnosisResult.status === "fulfilled") narratives.diagnosis = diagnosisResult.value;
  else console.error("wuxing [한 줄 진단 보충 문장] 실패:", diagnosisResult.reason);
  if (seunFlowResult.status === "fulfilled") narratives.seunFlow = seunFlowResult.value;
  else console.error("wuxing [3년 흐름 문단] 실패:", seunFlowResult.reason);

  return buildWuxingReport(chart, cls, narratives);
}

/**
 * POST /api/premium/wuxing — 로그인+프리미엄 필수.
 * body: { birth_date, birth_time|null, gender, calendar? } — 화면에서 확정한 대상 사주.
 * 흐름: 대상 확정 → 캐시 → 게이트 → 생성 → 저장.
 */
export async function POST(req: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await requireUser("/premium/ohang");
  if (!user.ok) return user.response;
  const userId = user.userId;

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주를 볼 방법이 없던 원인이었다.
  const parsed = parseTargetBody(await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;
  if (input.calendar === "lunar") {
    return NextResponse.json({ error: "음력 사주는 아직 지원하지 않습니다." }, { status: 400 });
  }

  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);
  const key = { userId, productId: PRODUCT_ID, target: input, ownProfile, isAdhoc };

  // 캐시를 게이트보다 먼저 본다. 이용권은 생성 성공 시 소진되므로, 게이트를 먼저
  // 통과시키면 이미 결제해 만든 리포트를 다시 열지 못한다. (미사용 이용권이 있으면
  // findCached가 건너뛴다 — 프로모션 이용권이 실제로 쓰이게. 구독자는 대상이 아니다.)
  const cached = await findCached<WuxingReportData>(key);
  if (cached) {
    // profileId는 화면이 "마이페이지에서 다시 열 수 있어요" 안내를 띄울지 판단하는 용도(값의 유무만 본다).
    return NextResponse.json(
      cached.adhoc
        ? { report: cached.content, cached: true, adhoc: true }
        : { report: cached.content, cached: true, profileId: cached.id }
    );
  }

  // 결정론적 계산 — 실패하면 이용권을 만지기 전에 돌려보낸다.
  let chart: ReturnType<typeof buildChart>;
  try {
    chart = buildChart(isoOf(input), input.gender, !!input.birthTime);
  } catch (e) {
    console.error("wuxing [사주 계산 실패]:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 400 });
  }

  // 대상이 다르면 다른 생성 시도다 — 입력값을 그대로 기록해 두면 실패 원인 추적이 쉽다.
  const began = await beginAttempt(userId, PRODUCT_ID, undefined, {
    birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime), gender: input.gender,
  });
  if (!began.ok) return began.response;
  const pass = await acquirePass(userId, PRODUCT_ID, began.attempt);
  if (!pass.ok) return pass.response;

  return runGeneration({
    label: "wuxing",
    attempt: began.attempt,
    passId: pass.passId,
    run: async () => {
      const report = await buildFullReport(chart);
      const savedId = await saveReport(key, report);
      return { report, savedId };
    },
    ok: ({ report, savedId }) =>
      NextResponse.json(
        isAdhoc
          ? { report, cached: false, adhoc: true }
          : { report, cached: false, savedProfile: !ownProfile, profileId: savedId }
      ),
    failureMessage: "생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    includeAttemptIdOnFailure: false,
  });
}

/**
 * DELETE /api/premium/wuxing — 로그인 필수. 사용자가 자기 결과를 직접 삭제.
 * query: id 또는 birth_date/birth_time/gender — 지금 화면에 띄운 리포트의 대상.
 *
 * 대상을 받지 않으면 가족 사주로 만든 리포트를 지우려다 **본인 리포트가 지워진다**.
 * 대상이 본인 사주와 같으면 기존 캐시에서, 다르면 1회성 캐시에서 지운다.
 */
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium/ohang");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const reportIdParam = q.get("id");
  if (reportIdParam) return deleteById(user.userId, PRODUCT_ID, reportIdParam);

  const parsed = parseTargetBody({
    birth_date: q.get("birth_date"), birth_time: q.get("birth_time"), gender: q.get("gender"),
  });
  // 대상이 안 왔으면(구버전 클라이언트 등) 예전처럼 본인 리포트를 지운다.
  return deleteByTarget({
    userId: user.userId, productId: PRODUCT_ID, target: parsed.ok ? parsed.input : null, variant: "",
  });
}
