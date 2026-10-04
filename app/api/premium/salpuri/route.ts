import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf, timeKeyOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, acquirePass, runGeneration } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById, deleteByTarget } from "@/lib/premium/report-store";
import { buildChart, stemBranchKr } from "@/lib/saju-engine";
import { generateSalpuriReport } from "@/lib/premium/salpuri-generate";
import { sinsalHanja, PILLAR_POSITION_NOTE } from "@/lib/premium/sinsal-glossary";
import { buildYongsinDualTrack, yongsinDualTrackPromptLine } from "@/lib/premium/yongsin-track";
import { buildSalpuriCard } from "@/lib/premium/salpuri-card";

// 살풀이 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/salpuri-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "salpuri_one";

/**
 * POST /api/premium/salpuri — 로그인+프리미엄 필수.
 * body: { birth_date, birth_time|null, gender, calendar? } — 화면에서 확정한 대상 사주.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser("/premium/salpuri");
  if (!user.ok) return user.response;
  const userId = user.userId;

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주를 볼 방법이 없던 원인이었다.
  const parsed = parseTargetBody(await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);
  const key = { userId, productId: PRODUCT_ID, target: input, ownProfile, isAdhoc };

  let chart;
  try {
    chart = buildChart(isoOf(input), input.gender, !!input.birthTime);
  } catch (e) {
    console.error("premium salpuri engine error:", e);
    return NextResponse.json({ error: "사주 계산 오류" }, { status: 500 });
  }

  // 같은 살이 여러 자리에 걸릴 수 있으므로 이름별로 위치를 묶는다.
  const grouped = new Map<string, { where: string[]; meaning: string }>();
  for (const s of chart.sal) {
    const cur = grouped.get(s.name);
    if (cur) cur.where.push(s.where);
    else grouped.set(s.name, { where: [s.where], meaning: s.meaning });
  }

  const salList = [...grouped.entries()].map(([name, v]) => ({ name, where: v.where }));
  // 결과 최상단 요약 카드용(캐시 히트·신규 생성 모두 같은 chart에서 뽑는다). 카드 조립 실패가 리포트를 막으면 안 된다.
  let card: ReturnType<typeof buildSalpuriCard> | null = null;
  try { card = buildSalpuriCard(chart); } catch (e) { console.error("살풀이 카드 데이터 실패(카드만 생략):", e); }

  // 캐시를 게이트보다 먼저 본다. 990원 이용권으로 이미 본 사용자는 이용권이 소진된 뒤라
  // 게이트를 먼저 통과시키면 자기 결과를 다시 열지 못한다. 본인 것만 조회하므로 안전하다.
  // (미사용 이용권이 있으면 findCached가 건너뛴다 — 프로모션 이용권이 실제로 쓰이게.)
  const cached = await findCached<string>(key);
  if (cached) {
    return NextResponse.json({
      report: cached.content, sal: salList, card, cached: true, ...(cached.adhoc ? { adhoc: true } : {}),
    });
  }

  // 동시 중복 생성(더블클릭 레이스) 차단 → 이용권 원자적 선점.
  // 순서가 중요하다: 예전엔 이용권을 먼저 선점한 뒤 시도 잠금을 걸어, 잠금이 409로 막히면 선점한
  // 이용권이 환불 없이 사라졌다(2026-10-04 리팩터에서 공통 파이프라인으로 바로잡음).
  const began = await beginAttempt(userId, PRODUCT_ID, undefined, {
    birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime), gender: input.gender,
  });
  if (!began.ok) return began.response;
  const pass = await acquirePass(userId, PRODUCT_ID, began.attempt);
  if (!pass.ok) return pass.response;

  // 신살이 6개 이상이면 전부 똑같이 자세히 쓰라고 하면 콜 하나의 소요 시간이
  // 개수에 비례해 계속 늘어나 Vercel 60초 상한을 넘긴다(실측). 상위 3개만
  // "주요 신살"로 자세히 쓰고, 나머지는 "그 외 신살"로 묶어 간결하게만
  // 언급하도록 데이터 자체를 나눠서 준다 — 신살이 아무리 많아도 분량이
  // 무한정 늘어나지 않는다.
  const salEntries = [...grouped.entries()];
  const isDense = salEntries.length >= 6;
  const majorEntries = isDense ? salEntries.slice(0, 3) : salEntries;
  const minorEntries = isDense ? salEntries.slice(3) : [];
  // QA(2026-09-05) B-2: 엔진은 신살을 한글 이름으로만 검출해 한자가 없다.
  // 병렬 4콜이 각자 한자를 "알아서" 채우면서 寡宿殺/孤宿殺처럼 같은 살이
  // 호출마다 다른 한자로 나가는 사고가 났다 — 검증된 한자(용어 백과, 13종
  // 전부 커버)를 미리 붙여 정답으로 준다.
  const formatSal = (entries: typeof salEntries) =>
    entries
      .map(([name, v]) => {
        const hanja = sinsalHanja(name);
        return `- ${name}${hanja ? `(${hanja})` : ""} (${v.where.join(", ")}): ${v.meaning}`;
      })
      .join("\n");

  const salSection = majorEntries.length === 0
    ? "검출된 신살 없음"
    : isDense
      ? `주요 신살 (자세히 설명할 것):\n${formatSal(majorEntries)}\n\n그 외 신살 (간결하게 한 줄씩만 언급할 것):\n${formatSal(minorEntries)}`
      : formatSal(majorEntries);

  // B-3: "일지=태어난 시간"처럼 자리 정의를 섹션마다 다르게(때로는 틀리게)
  // 쓰는 사고를 막기 위해 4콜 전부가 보는 engineSummary에 고정 정의를 둔다.
  // §1(CoS+CEO 실물 확인, 2026-09-08): 상품마다 용신을 다르게(오행은 병기,
  // 살풀이는 "용신인 X" 단정) 제시하던 문제 — 이전 회차에도 같은 지시를
  // 넣었으나 실제 생성에서 재발했다(재현 시점의 리포트가 그 수정 이전
  // 캐시였을 가능성이 있다). 오행 리포트·운명 설계도와 완전히 같은 문구를
  // 내도록 공용 모듈(lib/premium/yongsin-track.ts)의 표준 문구를 그대로
  // 쓴다 — 세 상품이 각자 비슷하게 다시 쓰다 미묘하게 갈리는 사고를 막는다.
  const yongsinLine = yongsinDualTrackPromptLine(buildYongsinDualTrack(chart));
  // §확인(2026-09-13 실물 재검증): chart.strength.detail은 "돕는 세력 2.8 vs
  // 빼앗는 세력 7. 월령 실令, 일지 실地." 형태인데, 이 원시 수치가 "주어진
  // 사실"로 프롬프트에 그대로 들어가면 COMMON_RULES(§0-7, "돕는 세력 2.8 대
  // 빼앗는 세력 7 인용 금지")가 있어도 모델이 이미 준 사실을 재인용하는
  // 것뿐이라고 여겨 가끔 그대로 베껴 쓴다(실측 3회). 판정 근거로 실제 쓰이는
  // "월령/일지 득실"은 남기고 숫자 절만 잘라낸다(엔진 계산 로직 자체는
  // 손대지 않음 — 표시 직전 문자열 가공만).
  const strengthQualitative = chart.strength.detail.match(/월령[\s\S]*$/)?.[0] ?? chart.strength.detail;
  const engineSummary = `
일주(日柱): ${stemBranchKr(chart.pillars.day.stem, chart.pillars.day.branch)}
일간(日干): ${chart.day_master} / 오행 ${chart.day_master_element}
신강·신약: ${chart.strength.verdict} (${strengthQualitative})
${yongsinLine}

${PILLAR_POSITION_NOTE}

[이 사주에서 실제로 검출된 신살 — 위에 표기된 한자를 그대로 쓰고 다른 한자를 새로 짓지 말 것]
${salSection}`.trim();

  return runGeneration({
    label: "salpuri",
    attempt: began.attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generateSalpuriReport(engineSummary, isDense);
      // 저장돼야 이용권 사용자가 재열람할 수 있다.
      await saveReport(key, report);
      return report;
    },
    ok: (report) => NextResponse.json({ report, sal: salList, card, cached: false }),
  });
}

/**
 * DELETE /api/premium/salpuri — 로그인 필수. 사용자가 자기 살풀이 결과를 직접 삭제.
 * query: birth_date/birth_time/gender — 지금 화면에 띄운 리포트의 대상.
 * 대상을 받지 않으면 가족 리포트를 지우려다 본인 리포트가 지워진다.
 */
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium/salpuri");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const reportIdParam = q.get("id");
  if (reportIdParam) return deleteById(user.userId, PRODUCT_ID, reportIdParam);

  const parsed = parseTargetBody({
    birth_date: q.get("birth_date"), birth_time: q.get("birth_time"), gender: q.get("gender"),
  });
  return deleteByTarget({
    userId: user.userId, productId: PRODUCT_ID, target: parsed.ok ? parsed.input : null, variant: "",
  });
}
