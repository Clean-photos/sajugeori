// 대운 이중 곡선 검증 — CoS §D-9 기준. 실행: npx tsx lib/blueprint-engine/daewoon-curve.test.ts
import { buildPreciseChart } from "./engine";
import { computeAnchorFacts } from "./anchor";
import { buildDaewoonCurve } from "./daewoon-curve";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++; else { fail++; console.error(`✗ ${name} ${detail}`); }
}

const NEG = /나쁨|흉|위험|떨어집니다|하락/;
const samples: [string, string, string, boolean][] = [
  ["辛 극신약 1987-06-01", "1987-06-01T14:30:00", "M", true],
  ["1990-05-05 여", "1990-05-05T12:00:00", "F", true],
  ["2000-01-15 남 시각모름", "2000-01-15T00:00:00", "M", false],
  ["1978-03-01 여", "1978-03-01T09:00:00", "F", true],
  ["1965-11-23 남", "1965-11-23T21:00:00", "M", true],
  ["1995-08-08 여", "1995-08-08T03:00:00", "F", true],
  ["1989-03-21 여 (CoS 10차 §6 지적 사례)", "1989-03-21T19:20:00", "F", true],
];

const shapes = new Set<string>();
for (const [name, iso, g, hasHour] of samples) {
  const chart = buildPreciseChart(iso, g, hasHour);
  const facts = computeAnchorFacts(chart);
  const a = buildDaewoonCurve(chart, facts)!;
  const b = buildDaewoonCurve(chart, facts)!;
  check(`${name} 결정성`, JSON.stringify(a) === JSON.stringify(b));
  check(`${name} 높음 구간 ≥1`, a.points.some((p) => p.eLabel === "높음") && a.points.some((p) => p.sLabel === "높음"));
  check(`${name} 주석 ≤2`, a.annotations.length <= 2);
  check(`${name} 주석 부정 표현 0`, a.annotations.every((x) => !NEG.test(x.text)) && !NEG.test(a.summary));
  const last = a.points.length - 1;
  check(`${name} 마지막 대운 주석 없음`, a.annotations.every((x) => x.index !== last));
  check(`${name} 값 범위`, a.points.every((p) => p.e >= 30 && p.e <= 91 && p.s >= 30 && p.s <= 91));
  check(`${name} 94세까지`, a.points[a.points.length - 1].startAge <= 94 && a.points[a.points.length - 1].startAge + 10 > 94);
  const cur = a.points.find((p) => p.isCurrent);
  if (cur && (cur.eLabel === "낮음" || cur.sLabel === "낮음")) check(`${name} 현재 낮음이면 반등 주석`, a.annotations.some((x) => x.text.includes("다시 올라섭니다")));
  // 2026-10-04(CoS 10차 §6): "확장 정점"은 대운 로드맵이 보강기로 판정한 구간에만 붙는다. 혼재·소진기·완만에는 없다.
  for (const x of a.annotations.filter((x) => x.text.includes("확장 정점"))) {
    check(`${name} 정점은 보강기에만`, a.points[x.index].phase === "boost", `phase=${a.points[x.index].phase}`);
  }
  check(`${name} 곡선 phase가 로드맵과 일치`, a.points.every((p) => {
    const r = facts.daewoonRoadmap.find((d) => d.start_age === p.startAge);
    return !r || r.phase === p.phase;
  }));
  if (!a.points.some((p, i) => p.phase === "boost" && i < last)) check(`${name} 보강기 없으면 정점 문구 없음`, !a.summary.includes("확장 정점"));
  if (name.startsWith("1989")) {
    const boostAges = a.points.filter((p) => p.phase === "boost").map((p) => `${p.startAge}`);
    console.log(`  1989 보강기 시작 나이: ${boostAges.join(",")} / 요약: ${a.summary}`);
    check("1989: 혼재 구간(55~64세)에 정점 라벨 없음", !a.annotations.some((x) => x.text.includes("확장 정점") && /^5[5-9]|^6[0-4]/.test(x.text)));
  }
  shapes.add(a.points.map((p) => `${p.eLabel}${p.sLabel}`).join(","));
  console.log(`${name}: ${a.points.map((p) => `${p.startAge}${p.eLabel[0]}${p.sLabel[0]}`).join(" ")} | ${a.summary} | ${a.annotations.map((x) => x.text).join(" / ")}`);
}
check("표본 곡선 모양이 서로 다름", shapes.size >= 4, `distinct=${shapes.size}`);

console.log(`\n통과 ${pass}건 / 실패 ${fail}건`);
process.exit(fail ? 1 : 0);
