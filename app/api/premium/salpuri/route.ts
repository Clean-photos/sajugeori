import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass, consumeOneTimePass } from "@/lib/billing/access";
import { startAttempt, finishAttemptDone, finishAttemptFailed } from "@/lib/billing/attempts";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import { SALPURI_ONE } from "@/lib/billing/plans";
import { buildChart, stemBranchKr } from "@/lib/saju-engine";
import { generateSalpuriReport } from "@/lib/premium/salpuri-generate";

// 살풀이 리포트 생성이 병렬 2콜로 나뉘어 있어도(lib/premium/salpuri-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "salpuri_one";

// POST /api/premium/salpuri — 로그인+프리미엄 필수. 등록된 내 사주의 신살을 실계산해 풀이.
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required", redirect: "/login?redirect=/premium/salpuri" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id, birth_date, birth_time, gender")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!profile?.birth_date) {
    return NextResponse.json({ error: "profile_required", redirect: "/onboarding" }, { status: 403 });
  }

  let chart;
  try {
    const iso = profile.birth_time
      ? `${profile.birth_date}T${profile.birth_time}`
      : `${profile.birth_date}T00:00:00`;
    chart = buildChart(iso, profile.gender ?? "M", !!profile.birth_time);
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
  try {
    const { data: cached } = await supabaseAdmin
      .from("premium_salpuri_reports").select("content")
      .eq("saju_profile_id", profile.id).or(notExpiredFilter()).limit(1).single();
    if (cached?.content) {
      return NextResponse.json({ report: cached.content, sal: salList, cached: true });
    }
  } catch { /* 테이블 없음 또는 미저장 → 생성 진행 */ }

  // 구독자 또는 990원 1회 이용권 보유자만 신규 생성 가능
  const premium = await isPremiumUser(userId);
  const passId = premium ? null : await findUnusedOneTimePass(userId, SALPURI_ONE.id);
  if (!premium && !passId) {
    return NextResponse.json({ error: "premium_required", redirect: "/premium/salpuri" }, { status: 402 });
  }

  // 동시 중복 생성(더블클릭 레이스) 차단
  const started = await startAttempt(userId, PRODUCT_ID, undefined, { saju_profile_id: profile.id });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }

  const salLines = [...grouped.entries()]
    .map(([name, v]) => `- ${name} (${v.where.join(", ")}): ${v.meaning}`)
    .join("\n");

  const engineSummary = `
일주(日柱): ${stemBranchKr(chart.pillars.day.stem, chart.pillars.day.branch)}
일간(日干): ${chart.day_master} / 오행 ${chart.day_master_element}
신강·신약: ${chart.strength.verdict} (${chart.strength.detail})
용신 후보: 억부 ${chart.yongsin.eokbu_candidates.join("·") || "없음"} / 조후 ${chart.yongsin.johu_candidates.join("·") || "없음"}

[이 사주에서 실제로 검출된 신살]
${salLines || "검출된 신살 없음"}`.trim();

  try {
    const report = await generateSalpuriReport(engineSummary);

    // 캐시 저장 (테이블 없으면 무시). 저장돼야 이용권 사용자가 재열람할 수 있다.
    try {
      await supabaseAdmin.from("premium_salpuri_reports").upsert(
        { saju_profile_id: profile.id, user_id: userId, content: report, expires_at: reportExpiresAtIso() },
        { onConflict: "saju_profile_id" }
      );
    } catch { /* noop */ }

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

// DELETE /api/premium/salpuri — 로그인 필수. 사용자가 자기 살풀이 결과를 직접 삭제.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();
  if (!profile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }

  await supabaseAdmin.from("premium_salpuri_reports").delete()
    .eq("saju_profile_id", profile.id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
