import assert from "node:assert/strict";
const { buildChart, mutualAnalysis } = await import("./index");

// CoS 10차 §4: 나·상대를 바꿔 입력해도 점수가 같아야 하고, 프리미엄(시각 모름)과 같은 값이어야 한다.
const a = buildChart("1989-03-21T00:00:00", "F", false);
const b = buildChart("1991-08-14T00:00:00", "M", false);
const score = (me: typeof a, other: typeof a, ctx: "romance" | "work" | "friend" = "romance") =>
  Math.min(100, Math.max(0, Math.round(38 + mutualAnalysis(me, other, "나", "상대", ctx).combinedScore * 6)));
for (const ctx of ["romance", "work", "friend"] as const) {
  assert.equal(score(a, b, ctx), score(b, a, ctx), `${ctx}: 입력 방향을 바꿔도 점수 동일`);
}
console.log("compat symmetry OK", score(a, b));
