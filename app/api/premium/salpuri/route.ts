import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  parseTargetBody, resolveTarget, readAdhocCache, writeAdhocCache,
  ensureOwnProfileId, isoOf, timeKeyOf, loadOwnProfile, sameAsProfile,
} from "@/lib/billing/report-target";
import { SALPURI_ONE } from "@/lib/billing/plans";
import { buildChart, stemBranchKr } from "@/lib/saju-engine";
import { generateSalpuriReport } from "@/lib/premium/salpuri-generate";

// 살풀이 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/salpuri-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "salpuri_one";

/**
 * POST /api/premium/salpuri — 로그인+프리미엄 필수.
 * body: { birth_date, birth_time|null, gender, calendar? } — 화면에서 확정한 대상 사주.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/salpuri" }, { status: 401 });
  }
  const userId = session.user.id;

  // 대상 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주를 볼 방법이 없던 원인이었다.
  const parsed = parseTargetBody(await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, input);

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

  // 캐시를 게이트보다 먼저 본다. 990원 이용권으로 이미 본 사용자는 이용권이 소진된 뒤라
  // 게이트를 먼저 통과시키면 자기 결과를 다시 열지 못한다. 본인 것만 조회하므로 안전하다.
  if (isAdhoc) {
    const cached = await readAdhocCache(userId, PRODUCT_ID, input);
    if (cached) return NextResponse.json({ report: cached, sal: salList, cached: true, adhoc: true });
  } else if (ownProfile?.id) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("premium_salpuri_reports").select("content")
        .eq("saju_profile_id", ownProfile.id).or(notExpiredFilter()).limit(1).maybeSingle();
      if (cached?.content) {
        return NextResponse.json({ report: cached.content, sal: salList, cached: true });
      }
    } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }
  }

  // 구독자 또는 990원 1회 이용권 보유자만 신규 생성 가능
  const premium = await isPremiumUser(userId);
  const passId = premium ? null : await findUnusedOneTimePass(userId, SALPURI_ONE.id);
  if (!premium && !passId) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/salpuri" }, { status: 402 });
  }

  // 동시 중복 생성(더블클릭 레이스) 차단
  const started = await startAttempt(userId, PRODUCT_ID, undefined, {
    birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime), gender: input.gender,
  });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  // 신살이 6개 이상이면 전부 똑같이 자세히 쓰라고 하면 콜 하나의 소요 시간이
  // 개수에 비례해 계속 늘어나 Vercel 60초 상한을 넘긴다(실측). 상위 3개만
  // "주요 신살"로 자세히 쓰고, 나머지는 "그 외 신살"로 묶어 간결하게만
  // 언급하도록 데이터 자체를 나눠서 준다 — 신살이 아무리 많아도 분량이
  // 무한정 늘어나지 않는다.
  const salEntries = [...grouped.entries()];
  const isDense = salEntries.length >= 6;
  const majorEntries = isDense ? salEntries.slice(0, 3) : salEntries;
  const minorEntries = isDense ? salEntries.slice(3) : [];
  const formatSal = (entries: typeof salEntries) =>
    entries.map(([name, v]) => `- ${name} (${v.where.join(", ")}): ${v.meaning}`).join("\n");

  const salSection = majorEntries.length === 0
    ? "검출된 신살 없음"
    : isDense
      ? `주요 신살 (자세히 설명할 것):\n${formatSal(majorEntries)}\n\n그 외 신살 (간결하게 한 줄씩만 언급할 것):\n${formatSal(minorEntries)}`
      : formatSal(majorEntries);

  const engineSummary = `
일주(日柱): ${stemBranchKr(chart.pillars.day.stem, chart.pillars.day.branch)}
일간(日干): ${chart.day_master} / 오행 ${chart.day_master_element}
신강·신약: ${chart.strength.verdict} (${chart.strength.detail})
용신 후보: 억부 ${chart.yongsin.eokbu_candidates.join("·") || "없음"} / 조후 ${chart.yongsin.johu_candidates.join("·") || "없음"}

[이 사주에서 실제로 검출된 신살]
${salSection}`.trim();

  try {
    const report = await generateSalpuriReport(engineSummary, isDense);

    // 캐시 저장 (테이블 없으면 무시). 저장돼야 이용권 사용자가 재열람할 수 있다.
    if (isAdhoc) {
      // 1회성 — 본인 프로필도, 본인 리포트 캐시도 건드리지 않는다.
      await writeAdhocCache(userId, PRODUCT_ID, input, report);
    } else {
      // 등록된 사주가 없던 사람이면 이 입력이 본인 프로필로 저장된다(016 규칙).
      const profileId = await ensureOwnProfileId(userId, input, ownProfile);
      if (profileId) {
        try {
          await supabaseAdmin.from("premium_salpuri_reports").upsert(
            { saju_profile_id: profileId, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
            { onConflict: "saju_profile_id" }
          );
        } catch { /* noop */ }
      }
    }

    // 이용권 사용자는 생성 성공 시점에 소진 (실패 시 이용권 보존)
    if (passId) await consumeOneTimePass(passId);
    await finishAttemptDone(started.attemptId);

    return NextResponse.json({ report, sal: salList, cached: false });
  } catch (e) {
    console.error("premium salpuri LLM error:", e);
    await finishAttemptFailed(started.attemptId, "LLM 호출 오류");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: started.attemptId }, { status: 500 });
  }
}

/**
 * DELETE /api/premium/salpuri — 로그인 필수. 사용자가 자기 살풀이 결과를 직접 삭제.
 * query: birth_date/birth_time/gender — 지금 화면에 띄운 리포트의 대상.
 * 대상을 받지 않으면 가족 리포트를 지우려다 본인 리포트가 지워진다.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const q = req.nextUrl.searchParams;
  const parsed = parseTargetBody({
    birth_date: q.get("birth_date"), birth_time: q.get("birth_time"), gender: q.get("gender"),
  });
  const ownProfile = await loadOwnProfile(userId);

  if (parsed.ok && ownProfile && !sameAsProfile(parsed.input, ownProfile)) {
    const input = parsed.input;
    await supabaseAdmin.from("premium_adhoc_reports").delete()
      .eq("user_id", userId).eq("product_id", PRODUCT_ID)
      .eq("birth_date", input.birthDate).eq("birth_time", timeKeyOf(input.birthTime))
      .eq("gender", input.gender).eq("variant", "");
    return NextResponse.json({ ok: true });
  }

  if (!ownProfile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }
  await supabaseAdmin.from("premium_salpuri_reports").delete()
    .eq("saju_profile_id", ownProfile.id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
