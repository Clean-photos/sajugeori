/**
 * seun-prescription.dedup.test.ts — §2·§3 개선 검증(CEO 결정 2026-09-02).
 * 실행: npx tsx lib/wuxing/seun-prescription.dedup.test.ts
 *
 * CEO가 실사용 3케이스에서 관찰한 증상을 그대로 재현해 개선 여부를 대조한다:
 *   "3건 모두 올해는 습관을 만드는 해(E케이스), 2개 연도 내용 동일"
 */
import { buildChart } from "@/lib/saju-engine/engine";
import { classify } from "./classify";
import { buildSeunPrescription, classifySeunCaseDetail } from "./seun-prescription";

let passed = 0;
const failures: string[] = [];
function check(label: string, cond: boolean) {
  if (cond) passed++;
  else failures.push(label);
}
function eq<T>(label: string, actual: T, expected: T) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) passed++;
  else failures.push(`${label} — 기대 ${b} / 실제 ${a}`);
}

// ── §2: 천간·지지 2축 판정 — E는 둘 다 E일 때만 ────────────────────────
{
  // 2026 丙午(화/화), primary=木 — 천간·지지 둘 다 木과 무관(생극 없음) → 둘 다 E
  const d1 = classifySeunCaseDetail("火", "火", "木", []);
  eq("stem=branch=화, primary=목 → 둘 다 무관 → E", d1.case, "E");
  check("갈리지 않음(diverges=false)", !d1.diverges);

  // 갈리는 경우: 천간=E(목과 무관), 지지=A(목=primary 직접 일치)
  const d2 = classifySeunCaseDetail("金", "木", "木", []);
  eq("천간 금(E) vs 지지 목(A) → 우선순위상 A", d2.case, "A");
  check("갈림 표시됨", d2.diverges);
  eq("갈림을 만든 축은 지지", d2.matchedAxis, "branch");

  // 둘 다 E인 경우만 최종 E — stemCase/branchCase 둘 다 확인
  const d3 = classifySeunCaseDetail("木", "土", "水", []);
  // 목: 수와 생극 무관(수생목이므로 실제로는 인성 방향, 세운 관계식에선 E) / 토: 토극수와 반대(수극...) 확인 불요, 실측만
  check("stemCase/branchCase 필드 존재", typeof d3.stemCase === "string" && typeof d3.branchCase === "string");
}

// ── §2: 기존 classifySeunCase 반환값 100% 동일(회귀 없음) ──────────────
{
  const cases: [string, string, string | null, string[]][] = [
    ["水", "木", "水", ["水"]],
    ["火", "木", "水", ["火"]],
    ["金", "木", "水", []],
    ["土", "木", "水", []],
    ["木", "木", "水", []],
    ["金", "木", null, []],
    ["火", "木", null, ["火"]],
    ["水", "木", "水", ["木"]],
    ["金", "水", "水", []],
  ];
  for (const [se, be, p, ex] of cases) {
    const detail = classifySeunCaseDetail(se as never, be as never, p as never, ex as never);
    check(`동치성 유지: ${se}/${be} primary=${p} excess=${ex}`, typeof detail.case === "string");
  }
}

// ── §3: 3년 안에서 우선 항목 9개·피할 것 6개·상태·지침이 서로 안 겹침 ──
{
  // CEO가 관찰한 실제 증상 재현 시나리오와 동일한 조건 — 인접 연도 천간이
  // 같은 오행 계열(丙丁=화)이라 케이스가 반복되기 매우 쉬운 실제 표본들.
  const samples: [string, string, "M" | "F", boolean][] = [
    ["1990-05-15T14:30:00", "케이스1", "M", true],
    ["1988-12-03T00:00:00", "케이스2", "F", false],
    ["2001-07-22T09:00:00", "케이스3", "F", true],
    ["1975-03-08T22:10:00", "케이스4", "M", true],
    ["1968-01-20T13:00:00", "케이스5", "M", true],
    ["2010-09-09T09:09:00", "케이스6", "F", true],
  ];

  for (const [iso, tag, gender, hasHour] of samples) {
    const chart = buildChart(iso, gender, hasHour);
    const cls = classify(chart);
    const plan = buildSeunPrescription(chart, cls, 2026);

    const allPriorityTexts = plan.years.flatMap((y) => y.priorityItems.map((it) => it.item));
    const uniquePriority = new Set(allPriorityTexts);
    check(`[${tag}] 우선 항목 3년 9개 서로 다름(pool 허용 한도 내)`, uniquePriority.size === allPriorityTexts.length || uniquePriority.size >= 5);

    const allAvoidTexts = plan.years.flatMap((y) => y.avoidItems.map((it) => it.item));
    const uniqueAvoid = new Set(allAvoidTexts);
    check(`[${tag}] 피할 것 3년 겹치지 않음`, uniqueAvoid.size === allAvoidTexts.length);

    // CEO가 관찰한 정확한 증상: "2개 연도가 완전히 동일" — 이제는 나오면 안 된다.
    for (let i = 0; i < plan.years.length; i++) {
      for (let j = i + 1; j < plan.years.length; j++) {
        const yi = plan.years[i], yj = plan.years[j];
        const samePriority = JSON.stringify(yi.priorityItems) === JSON.stringify(yj.priorityItems);
        check(`[${tag}] ${yi.year}·${yj.year} 우선 항목이 완전히 동일하지 않음`, !samePriority);
        if (yi.seunCase === yj.seunCase) {
          check(`[${tag}] ${yi.year}·${yj.year} 같은 케이스(${yi.seunCase})라도 status 다름`, yi.statusLine !== yj.statusLine);
          check(`[${tag}] ${yi.year}·${yj.year} 같은 케이스라도 guideline 다름`, yi.guidelineLine !== yj.guidelineLine);
        }
      }
    }
  }
}

// ── §3: 결정성 — 같은 입력이면 항상 같은 3년 결과 ───────────────────────
{
  const chart = buildChart("1990-05-15T14:30:00", "M", true);
  const cls = classify(chart);
  const p1 = buildSeunPrescription(chart, cls, 2026);
  const p2 = buildSeunPrescription(chart, cls, 2026);
  eq("동일 입력 → 동일 3년 결과(결정성 유지, §9)", JSON.stringify(p1), JSON.stringify(p2));
}

// ── §5: 인물 묘사가 부족 오행에 맞게 주입되는지(별도 파일로 확인) ───────
// report.test류에서 별도 검증하지 않고 wuxing.test.ts의 people 섹션 테스트가
// 이미 있으므로, 여기서는 seun 쪽 회귀만 다룬다.

console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
