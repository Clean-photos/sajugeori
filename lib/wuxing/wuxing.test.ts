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
import { elementDict, pickAxisItems, totalItemCount, AXES } from "./dict";

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

// 과다 3단계 — 라벨 구간이 서로 겹치지 않아야 한다 (3개=다소많음 / 4개+=과다 / 5개+=극단형)
{
  let n = 0, mild = 0, exc = 0, ext = 0;
  for (let y = 1970; y <= 2005; y += 3) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [3, 19]) {
        const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
        const cl = classify(buildChart(iso, "M", true));
        n++;
        if (cl.mildlyMany.length > 0) mild++;
        if (cl.excessive.length > 0) exc++;
        if (cl.pattern === "extreme") ext++;

        // 같은 오행이 두 라벨에 동시에 들어가면 안 된다
        check("다소많음 ∩ 과다 = 공집합", cl.mildlyMany.every((el) => !cl.excessive.includes(el)));
        check("다소많음은 정확히 3개", cl.mildlyMany.every((el) => cl.count.surface[el] === THRESHOLD.mildlyMany));
        check("과다는 4개 이상", cl.excessive.every((el) => cl.count.surface[el] >= THRESHOLD.excessive));
        // 극단형의 dominant는 과다에도 반드시 포함된다 (5 >= 4)
        if (cl.dominant) check("극단형 dominant ⊂ 과다", cl.excessive.includes(cl.dominant));
      }
    }
  }
  // 실측 빈도대(8글자, 6912건): 다소많음 59.9% / 과다 28.2% / 극단형 5.2%.
  // 다소많음은 "정확히 3개"라 "3개 이상"(83.5%)과 다른 수치다. 표본이 작아 범위로 확인한다
  check("다소많음 빈도 50~70%", mild / n > 0.5 && mild / n < 0.7, `${(mild / n * 100).toFixed(1)}%`);
  check("과다 빈도 15~40%", exc / n > 0.15 && exc / n < 0.4, `${(exc / n * 100).toFixed(1)}%`);
  check("극단형 빈도 1~12%", ext / n > 0.01 && ext / n < 0.12, `${(ext / n * 100).toFixed(1)}%`);
}

// 시간 미상도 같은 정수 임계값을 쓴다 (강도 비례 아님 — 보수 원칙)
{
  const cl = classify(buildChart(CASES[1].iso, "F", false));
  check("[B] 6글자도 과다 임계 4개 동일", cl.excessive.every((el) => cl.count.surface[el] >= THRESHOLD.excessive));
  check("[B] 6글자 다소많음도 3개", cl.mildlyMany.every((el) => cl.count.surface[el] === THRESHOLD.mildlyMany));
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

// ── A층 사전 (§10-2) ───────────────────────────────────────────────
{
  const strengthTally: Record<string, number> = { A: 0, B: 0, C: 0 };
  let total = 0;

  for (const el of C.ELEMENTS) {
    const d = elementDict(el);
    check(`[${el}] label 존재`, d.label.length > 0);
    check(`[${el}] 보조 오행 = 이 오행을 생하는 오행`, C.GENERATES[d.supportElement] === el, `${d.supportElement} → ${C.GENERATES[d.supportElement]}`);

    for (const ax of AXES) {
      const items = d.axes[ax];
      check(`[${el}.${ax}] 항목 5개 이상`, items.length >= 5, `${items.length}개`);
      for (const it of items) {
        total++;
        strengthTally[it.strength]++;
        check(`[${el}.${ax}] 항목·근거·실행 모두 있음`, !!it.item && !!it.basis && !!it.action, JSON.stringify(it));
        check(`[${el}.${ax}] 강도는 A/B/C`, ["A", "B", "C"].includes(it.strength), it.strength);
      }
    }
    // 설기
    check(`[${el}] 설기 항목 5개`, d.drain.items.length === 5, `${d.drain.items.length}개`);
    for (const it of d.drain.items) {
      total++;
      strengthTally[it.strength]++;
      check(`[${el}] 설기 항목·근거 있음`, !!it.item && !!it.basis);
    }
    // 설기 방향 — self면 반드시 "이 오행이 생하는 오행"이어야 한다
    if (d.drain.scope === "self") {
      eq(`[${el}] 설기 방향 = ${el}이 생하는 오행`, d.drain.target, C.GENERATES[el]);
    }
  }

  eq("사전 총 항목 수 217", totalItemCount(), 217);
  eq("총계는 순회 합계와 일치", total, 217);

  // 근거 강도 A가 40%를 넘으면 안 된다 (§3-⑤ — 전부 단정하지 않는 것이 신뢰를 만든다)
  const aRatio = strengthTally.A / total;
  check("강도 A 비중 40% 이하", aRatio <= 0.4, `${(aRatio * 100).toFixed(1)}%`);
  console.log(`  사전 강도 분포: A ${strengthTally.A} / B ${strengthTally.B} / C ${strengthTally.C} (총 ${total})`);

  // 결정 ① 목편 색 — 청색·청록이 1순위, 초록은 병행. "짙은 파랑"은 수편과 겹치므로 금지
  const woodColor = elementDict("木").axes.color;
  check("[결정①] 목 색 1순위에 청록", woodColor[0].item.includes("청록"), woodColor[0].item);
  check("[결정①] 목 색에 '짙은 파랑' 없음 (수편 감청과 색역 충돌)", !woodColor.some((i) => i.item.includes("짙은 파랑")));
  check("[결정①] 초록은 병행 표기", woodColor.some((i) => i.item.includes("초록") && i.item.includes("병행")));

  // 결정 ② 토편 방위 — 간방 유지 + 유파 단서 병기, 강도 C
  const earthDir = elementDict("土").axes.direction.find((i) => i.item.includes("남서"))!;
  check("[결정②] 토 간방 항목 유지", !!earthDir);
  check("[결정②] 유파 단서 병기", earthDir.basis.includes("유파에 따라 갈리며"), earthDir.basis);
  eq("[결정②] 강도 C", earthDir.strength, "C");

  // 결정 ③ 누락 5건 + 토편 꿀 제거
  check("[결정③] 수 색축에 하늘색·청록 배제 안내", elementDict("水").axes.color.some((i) => i.item.includes("하늘색") && i.item.includes("수가 아니다")));
  check("[결정③] 수 소재축에 고인 물 관리 단서", elementDict("水").axes.material.some((i) => i.basis.includes("고인 물")));
  check("[결정③] 화 행동축에 햇볕 쬐기 신설", elementDict("火").axes.habit.some((i) => i.item.includes("햇볕")));
  check("[결정③] 화 색축에 분홍", elementDict("火").axes.color.some((i) => i.item.includes("분홍")));
  check("[결정③] 화 음식축에 팥", elementDict("火").axes.food.some((i) => i.item.includes("팥")));
  check("[결정③] 금 음식축에 양파", elementDict("金").axes.food.some((i) => i.item.includes("양파")));
  check("[결정③] 금 음식축에 백김치", elementDict("金").axes.food.some((i) => i.item.includes("백김치")));
  check("[결정③] 토 음식축에서 꿀 제거", !elementDict("土").axes.food.some((i) => i.item.includes("꿀")));

  // 수편 설기는 성격이 다르다 — "수 과다"가 아니라 "화 과다 동반" 처방임이 명시돼야 한다
  eq("수편 설기 scope", elementDict("水").drain.scope, "companion-fire");
  check("수편 설기에 성격 차이 명시", elementDict("水").drain.principle.includes("수가 과다할 때"));

  // 압축 헬퍼 (§5 A층 1장 압축)
  const top3 = pickAxisItems("水", "food", 3);
  eq("압축: 기본은 원본 순서 상위 3개", top3.map((i) => i.item), elementDict("水").axes.food.slice(0, 3).map((i) => i.item));
  const byStrength = pickAxisItems("水", "food", 3, { byStrength: true });
  check("압축: 강도순은 A가 먼저", byStrength[0].strength === "A");
  eq("압축: limit 초과 요청은 있는 만큼만", pickAxisItems("水", "color", 99).length, elementDict("水").axes.color.length);
}

// ── 결과 ───────────────────────────────────────────────────────────
console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
