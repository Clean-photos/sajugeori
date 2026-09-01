import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runSajuEngine } from "@/lib/saju-engine";
import { classify } from "@/lib/wuxing/classify";
import { buildDiagnosis } from "@/lib/wuxing/diagnosis";
import { generateDiagnosisNarrative } from "@/lib/wuxing/diagnosis-narrative";
import { buildSeunPrescription } from "@/lib/wuxing/seun-prescription";
import { generateSeunNarrative } from "@/lib/wuxing/seun-narrative";
import { buildWuxingReport, type WuxingNarratives } from "@/lib/wuxing/report";

// LLM 호출 2곳(§① 보충 문장·§⑥ 흐름 문단)이 병렬이라 개별 실측(6~14초)보다 여유 있게 잡는다.
export const maxDuration = 60;

/**
 * POST /api/premium/wuxing — 오행 보완 리포트 생성.
 *
 * ⚠️ §13 작업 규칙: "개발은 진행하되 판매 노출 시점은 별도 지시". 이 라우트는 결제·
 * 상품 등록(lib/billing/plans.ts REPORT_PRODUCTS) 전이라 아직 팔 수 있는 상품이
 * 아니다. checkReportAccess()를 재사용하면 활성 구독자는 product_id 등록 여부와
 * 무관하게 즉시 통과되므로(isPremiumUser 체크가 앞선다), 이 라우트가 배포되는
 * 순간 미가격·미공지 기능이 기존 구독자에게 조용히 열리는 문제가 있다.
 *
 * 그래서 결제 게이트 대신 명시적 기능 플래그(WUXING_ENABLED)로 잠가 둔다 — 값이
 * "1"이 아니면 로그인 여부와 무관하게 404. Vercel에는 아직 설정하지 않았으니
 * 배포되어도 프로덕션에서는 비활성 상태다. 로컬 실측에는 .env.local에서만 켠다.
 * §10 9단계(결제 연결)에서 checkReportAccess/consumeOneTimePass로 교체한다.
 */
export async function POST(req: NextRequest) {
  if (process.env.WUXING_ENABLED !== "1") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = await req.json();
  const { birth_date, birth_time, calendar, gender } = body;

  if (!birth_date || !gender || !calendar) {
    return NextResponse.json({ error: "birth_date, gender, calendar are required" }, { status: 400 });
  }
  if (!["M", "F"].includes(gender)) {
    return NextResponse.json({ error: "gender must be M or F" }, { status: 400 });
  }

  let chart: ReturnType<typeof runSajuEngine>["saju_raw"];
  try {
    chart = runSajuEngine({ birth_date, birth_time: birth_time ?? null, calendar, gender }).saju_raw;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Engine error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const cls = classify(chart);
  const diagnosis = buildDiagnosis(chart, cls);
  const seunPlan = buildSeunPrescription(chart, cls);

  // LLM 호출 2곳은 서로 무관한 입력을 쓰므로 병렬로 돌린다 — 원가 실측(2026-08-31)에서
  // 단독 6.3~14.2초였으니 순차로 돌리면 최대 28초까지 늘어난다. 하나가 실패해도 나머지
  // 응답은 살리고, 실패한 자리는 "준비하고 있습니다" 폴백으로 컴포넌트가 자체 처리한다
  // (지어낸 문구를 채우지 않는다는 이 상품 전체의 원칙).
  const [diagnosisResult, seunFlowResult] = await Promise.allSettled([
    generateDiagnosisNarrative(diagnosis),
    generateSeunNarrative(chart, cls, seunPlan),
  ]);

  const narratives: WuxingNarratives = {};
  if (diagnosisResult.status === "fulfilled") {
    narratives.diagnosis = diagnosisResult.value;
  } else {
    console.error("wuxing [한 줄 진단 보충 문장] 실패:", diagnosisResult.reason);
  }
  if (seunFlowResult.status === "fulfilled") {
    narratives.seunFlow = seunFlowResult.value;
  } else {
    console.error("wuxing [3년 흐름 문단] 실패:", seunFlowResult.reason);
  }

  const report = buildWuxingReport(chart, cls, narratives);
  return NextResponse.json({ report });
}
