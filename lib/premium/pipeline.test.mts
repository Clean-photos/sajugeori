import assert from "node:assert/strict";

// lib/db/client.ts가 import 시점에 클라이언트를 만든다 — 실제 접속은 하지 않으므로 더미 값이면 된다.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service";

const { beginAttempt, abortAttempt, acquirePass, failAttempt, runGeneration } = await import("./pipeline");
type Deps = Parameters<typeof beginAttempt>[4];

function fakeDeps(over: Partial<{
  start: { ok: true; attemptId: string | null; input: Record<string, unknown> } | { ok: false; status: number; error: string; busy?: boolean };
  access: { allowed: boolean; passId: string | null };
}> = {}) {
  const log: string[] = [];
  const deps = {
    startAttempt: async () => { log.push("start"); return over.start ?? { ok: true as const, attemptId: "att1", input: { a: 1 } }; },
    discardAttempt: async (id: string | null) => { log.push(`discard:${id}`); },
    finishAttemptDone: async (id: string | null) => { log.push(`done:${id}`); },
    finishAttemptFailed: async (id: string | null, m: string) => { log.push(`failed:${id}:${m}`); },
    checkReportAccess: async () => { log.push("access"); return over.access ?? { allowed: true, passId: "pass1" }; },
    refundOneTimePass: async (id: string) => { log.push(`refund:${id}`); },
  } as unknown as Deps;
  return { deps, log };
}
const body = async (r: Response) => ({ status: r.status, json: await r.json() });

// 1) 중복 요청(busy) — 이용권을 건드리기 전에 막힌다(살풀이에서 환불 없이 사라지던 경로)
{
  const { deps, log } = fakeDeps({ start: { ok: false, status: 409, error: "이미 생성 중입니다.", busy: true } });
  const r = await beginAttempt("u", "salpuri_one", undefined, {}, deps);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(await body(r.response), { status: 409, json: { error: "이미 생성 중입니다.", busy: true } });
  assert.deepEqual(log, ["start"], "busy면 이용권 선점(access)까지 가면 안 된다");
}

// 2) 이용권 없음 — 시도 기록 삭제 + 402 + 구매 페이지 안내
{
  const { deps, log } = fakeDeps({ access: { allowed: false, passId: null } });
  const b = await beginAttempt("u", "yearly_one", undefined, {}, deps);
  assert.ok(b.ok);
  const a = await acquirePass("u", "yearly_one", (b as { attempt: never }).attempt, deps);
  assert.equal(a.ok, false);
  if (!a.ok) assert.deepEqual(await body(a.response), { status: 402, json: { error: "premium_required", redirect: "/premium/buy?product=yearly_one" } });
  assert.deepEqual(log, ["start", "access", "discard:att1"]);
}

// 3) 정상 — 시도 완료 표시, 이용권은 환불되지 않는다
{
  const { deps, log } = fakeDeps();
  const b = await beginAttempt("u", "pet_one", "retry", {}, deps);
  assert.ok(b.ok);
  const attempt = (b as { attempt: { attemptId: string | null; input: Record<string, unknown> } }).attempt;
  assert.deepEqual(attempt.input, { a: 1 });
  const a = await acquirePass("u", "pet_one", attempt, deps);
  assert.ok(a.ok);
  const { NextResponse } = await import("next/server");
  const res = await runGeneration({
    label: "pet", attempt, passId: (a as { passId: string | null }).passId,
    run: async () => "리포트", ok: (v) => NextResponse.json({ report: v }),
  }, deps);
  assert.deepEqual(await body(res), { status: 200, json: { report: "리포트" } });
  assert.deepEqual(log, ["start", "access", "done:att1"]);
}

// 4) 생성 실패 — 이용권 환불 + 실패 기록 + 같은 정보로 재생성할 attemptId 반환
{
  const { deps, log } = fakeDeps();
  const attempt = { attemptId: "att1", input: {} };
  const { NextResponse } = await import("next/server");
  const origError = console.error; console.error = () => {};
  const res = await runGeneration({
    label: "x", attempt, passId: "pass1",
    run: async () => { throw new Error("LLM down"); }, ok: () => NextResponse.json({}),
  }, deps);
  console.error = origError;
  assert.deepEqual(await body(res), {
    status: 500,
    json: { error: "분석 중 오류가 발생했습니다. 같은 정보로 다시 시도해주세요.", attemptId: "att1" },
  });
  assert.deepEqual(log, ["refund:pass1", "failed:att1:LLM 호출 오류"]);
}

// 5) 구독자(passId=null) 실패 — 환불 호출 없음
{
  const { deps, log } = fakeDeps();
  const { NextResponse } = await import("next/server");
  const origError = console.error; console.error = () => {};
  await runGeneration({ label: "x", attempt: { attemptId: "a", input: {} }, passId: null, run: async () => { throw new Error("x"); }, ok: () => NextResponse.json({}), includeAttemptIdOnFailure: false, failureMessage: "생성에 실패했습니다." }, deps);
  console.error = origError;
  assert.deepEqual(log, ["failed:a:LLM 호출 오류"]);
}

// 6) 엔진 오류 등 조기 실패 헬퍼 / 조기 반환 헬퍼
{
  const { deps, log } = fakeDeps();
  const { NextResponse } = await import("next/server");
  await failAttempt({ attemptId: "a", input: {} }, "p", "사주 계산 오류", NextResponse.json({}, { status: 500 }), deps);
  await abortAttempt({ attemptId: "a", input: {} }, NextResponse.json({}), deps);
  assert.deepEqual(log, ["refund:p", "failed:a:사주 계산 오류", "discard:a"]);
}

console.log("pipeline OK");
