/**
 * 오행 보완 리포트 판정 로직 검증 (§8 계수 / §2 유형 분기 / §7 세운 래퍼)
 *
 * 실행: npx tsx lib/wuxing/wuxing.test.ts
 *      (tsx가 없으면) node_modules/.bin/jiti lib/wuxing/wuxing.test.ts
 *
 * 저장소 관례에 따라 러너 없는 독립 스크립트다(vitest 미도입, CEO 확정 2026-08-31).
 * 실패 시 비정상 종료 코드로 끝난다.
 */
import { buildChart } from "../saju-engine/engine";
import * as C from "../saju-engine/constants";
import { countElements, isHiddenOnly, isTrulyAbsent } from "./count";
import { classify, THRESHOLD, generatorOf, controllerOf } from "./classify";
import { buildSeunPlan } from "./seun";

let passed = 0;
const failures: string[] = [];

function check(label: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

function eq<T>(label: string, actual: T, expected: T) {
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `기대 ${JSON.stringify(expected)} / 실제 ${JSON.stringify(actual)}`);
}

// ── 고정 케이스 (§7 확인 보고에서 쓴 것과 동일) ──────────────────────
const CASES = [
  { name: "A.1990-05-15 14:30 M", iso: "1990-05-15T14:30:00", gender: "M", hasHour: true },
  { name: "B.1988-12-03 시간미상 F", iso: "1988-12-03T00:00:00", gender: "F", hasHour: false },
  { name: "C.2001-07-22 09:00 F", iso: "2001-07-22T09:00:00", gender: "F", hasHour: true },
];

// ── §8 계수 ────────────────────────────────────────────────────────
for (const c of CASES) {
  const chart = buildChart(c.iso, c.gender, c.hasHour);
  const cnt = countElements(chart);
  const sum = C.ELEMENTS.reduce((a, el) => a + cnt.surface[el], 0);

  check(`[${c.name}] 표면 합계 = 글자 수`, sum === cnt.charCount, `합 ${sum} / 글자 ${cnt.charCount}`);
  eq(`[${c.name}] 글자 수`, cnt.charCount, c.hasHour ? 8 : 6);
  check(`[${c.name}] 표면 계수는 정수`, C.ELEMENTS.every((el) => Number.isInteger(cnt.surface[el])));
  check(
    `[${c.name}] 가중 계수는 엔진 원본 그대로`,
    JSON.stringify(cnt.weighted) === JSON.stringify(chart.elements)
  );
  // 가중 합계는 글자 수보다 크다 — 지장간이 더해지므로. "개수"로 표기하면 안 되는 이유
  const wsum = C.ELEMENTS.reduce((a, el) => a + cnt.weighted[el], 0);
  check(`[${c.name}] 가중 합계 > 글자 수 (개수 아님)`, wsum > cnt.charCount, `가중 ${wsum} / 글자 ${cnt.charCount}`);

  // hidden은 표면 0개인 오행에만 담긴다
  for (const el of C.ELEMENTS) {
    if (cnt.surface[el] > 0) check(`[${c.name}] ${el} 표면 있으면 hidden 비어야`, cnt.hidden[el].length === 0);
    check(`[${c.name}] ${el} 은 은닉/부재 중 하나만`, !(isHiddenOnly(cnt, el) && isTrulyAbsent(cnt, el)));
  }
}

// A케이스는 표면 木 0개인데 지장간에는 있다 — "겉으로는 없지만 숨어 있다" 서술의 근거
{
  const chart = buildChart(CASES[0].iso, "M", true);
  const cnt = countElements(chart);
  eq("[A] 木 표면 0개", cnt.surface["木"], 0);
  check("[A] 木 은닉 존재", isHiddenOnly(cnt, "木"), JSON.stringify(cnt.hidden["木"]));
  check("[A] 木 은닉 근거는 본기 가중치 내림차순", cnt.hidden["木"].every((h, i, arr) => i === 0 || arr[i - 1].weight >= h.weight));
}

// ── §2 유형 분기 ───────────────────────────────────────────────────
{
  // 시간 미상은 극단형 판정을 하지 않는다 (CEO 결정 ②)
  const noHour = classify(buildChart(CASES[1].iso, "F", false));
  check("[B] 시간 미상 → 극단형 아님", noHour.pattern !== "extreme");
  eq("[B] 시간 미상 → dominant 없음", noHour.dominant, null);
  eq("[B] 시간 미상 고지 플래그", noHour.hourUnknown, true);
  eq("[B] 시간 미상 → 채우기 프레임", noHour.frame, "fill");

  const withHour = classify(buildChart(CASES[0].iso, "M", true));
  eq("[A] 시간 있음 → 고지 불필요", withHour.hourUnknown, false);
  check("[A] primary 는 부재/부족 중에서 나온다", withHour.primary === null || withHour.count.surface[withHour.primary] <= THRESHOLD.scarce);
}

// 극단형 인공 케이스: 한 오행 5개 이상이면 순응 프레임으로 뒤집히는가
{
  // 표본을 훑어 실제 극단형 사주를 하나 찾는다 (인공 조작 없이 엔진 산출물로 검증)
  let found = null as null | ReturnType<typeof classify>;
  outer: for (let y = 1970; y <= 2005 && !found; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [3, 11, 19, 27]) {
        for (const h of [3, 9, 15, 21]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00`;
          const cl = classify(buildChart(iso, "M", true));
          if (cl.pattern === "extreme") { found = cl; break outer; }
        }
      }
    }
  }
  check("극단형 사주가 표본에 존재", found !== null);
  if (found) {
    eq("극단형 → 순응 프레임", found.frame, "follow");
    check("극단형 primary = dominant", found.primary === found.dominant);
    eq("극단형 secondary = 설기 통로(dominant가 생하는 오행)", found.secondary, [C.GENERATES[found.dominant!]]);
    eq("극단형 exclude = dominant를 극하는 오행", found.exclude, [controllerOf(found.dominant!)]);
    check("극단형 dominant 표면 5개 이상", found.count.surface[found.dominant!] >= THRESHOLD.extremeDominant);
  }
}

// 상생·상극 헬퍼
{
  eq("generatorOf(木) = 水", generatorOf("木"), "水");
  eq("generatorOf(火) = 木", generatorOf("火"), "木");
  eq("controllerOf(木) = 金", controllerOf("木"), "金");
  eq("controllerOf(水) = 土", controllerOf("水"), "土");
  for (const el of C.ELEMENTS) {
    eq(`GENERATES[generatorOf(${el})] = ${el}`, C.GENERATES[generatorOf(el)], el);
    eq(`CONTROLS[controllerOf(${el})] = ${el}`, C.CONTROLS[controllerOf(el)], el);
  }
}

// ── §7 세운 래퍼 ───────────────────────────────────────────────────
for (const c of CASES) {
  const chart = buildChart(c.iso, c.gender, c.hasHour);
  const plan = buildSeunPlan(chart, classify(chart), 2026);
  eq(`[${c.name}] 3년치`, plan.years.length, 3);
  eq(`[${c.name}] 연도 2026~2028`, plan.years.map((y) => y.year), [2026, 2027, 2028]);
  // 세운 간지는 사주 주인과 무관하게 그 해의 것이다
  eq(`[${c.name}] 2026 = 병오`, plan.years[0].ganji, "丙午(병오)");
  eq(`[${c.name}] 2027 = 정미`, plan.years[1].ganji, "丁未(정미)");
  eq(`[${c.name}] 2028 = 무신`, plan.years[2].ganji, "戊申(무신)");
  check(`[${c.name}] incoming 합 = 2 (천간1+지지1)`, plan.years.every((y) => Object.values(y.incoming).reduce((a, b) => a + b, 0) === 2));
  check(`[${c.name}] 교체와 배경 대운은 동시에 성립하지 않음`, !(plan.transition && plan.backgroundDaewoon));
}

// A케이스는 3년 창 안에서 대운이 바뀐다 (2027년 甲申→乙酉, 37세)
{
  const chart = buildChart(CASES[0].iso, "M", true);
  const plan = buildSeunPlan(chart, classify(chart), 2026);
  check("[A] 대운 교체 감지", plan.transition !== null, JSON.stringify(plan.transition));
  eq("[A] 교체 나이 37세", plan.transition?.aroundAge, 37);
  eq("[A] 교체 후 배경 대운 없음", plan.backgroundDaewoon, null);
}

// C케이스는 3년 내내 같은 대운 (戊戌, 25~34세)
{
  const chart = buildChart(CASES[2].iso, "F", true);
  const plan = buildSeunPlan(chart, classify(chart), 2026);
  eq("[C] 교체 없음", plan.transition, null);
  check("[C] 배경 대운 존재", plan.backgroundDaewoon !== null);
  eq("[C] 배경 대운 = 戊戌(무술)", plan.backgroundDaewoon?.ganji, "戊戌(무술)");
}

// 결정성 — 같은 입력이면 항상 같은 결과
for (const c of CASES) {
  const a = classify(buildChart(c.iso, c.gender, c.hasHour));
  const b = classify(buildChart(c.iso, c.gender, c.hasHour));
  check(`[${c.name}] 판정 결정적`, JSON.stringify(a) === JSON.stringify(b));
}

// ── 결과 ───────────────────────────────────────────────────────────
console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
