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
import {
  computeRelation,
  relationEntry,
  axisPriority,
  peopleAxisIsPrimary,
  adjustForStrength,
  partnerGuide,
  observationGuide,
  RELATIONS,
  relationDict,
} from "./relation";
import { buildSeunPrescription, classifySeunCase } from "./seun-prescription";
import { buildDiagnosis } from "./diagnosis";
import { wuxingBannerCopy, FILL_ARTICLE_ELEMENT } from "./banner";
import seunCopyPoolsJson from "./seun-copy.json";
const seunCopyPools = seunCopyPoolsJson.cases as Record<string, { status: string[]; guideline: string[] }>;

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

  // 수(水) 과다 설기 (CEO 승인 2026-08-31) — 수생목 방향, self scope
  eq("수편 설기 scope = self", elementDict("水").drain.scope, "self");
  eq("수편 설기 방향 = 木(수생목)", elementDict("水").drain.target, "木");
  check("수편 설기에 '짙은 파랑' 없음 (색역 충돌 방지)", !elementDict("水").drain.items.some((i) => i.item.includes("짙은 파랑")));
  check("수편 설기 색 항목은 청색·청록 표기", elementDict("水").drain.items.some((i) => i.item.includes("청록")));

  // companionDrain은 별도 블록 — 수 과다 설기로 오용되면 안 된다
  const companion = elementDict("水").companionDrain;
  check("수편 companionDrain 존재", !!companion);
  eq("companionDrain scope", companion?.scope, "companion-fire");
  check("companionDrain에 성격 차이 명시", !!companion?.principle.includes("화 과다"), companion?.principle);
  eq("companionDrain 항목 5개", companion?.items.length, 5);
  check("companionDrain은 totalItemCount에 안 들어감(중복 집계 방지)", totalItemCount() === 217);

  // 압축 헬퍼 (§5 A층 1장 압축)
  const top3 = pickAxisItems("水", "food", 3);
  eq("압축: 기본은 원본 순서 상위 3개", top3.map((i) => i.item), elementDict("水").axes.food.slice(0, 3).map((i) => i.item));
  const byStrength = pickAxisItems("水", "food", 3, { byStrength: true });
  check("압축: 강도순은 A가 먼저", byStrength[0].strength === "A");
  eq("압축: limit 초과 요청은 있는 만큼만", pickAxisItems("水", "color", 99).length, elementDict("水").axes.color.length);
}

// ── B층 관계 레이어 (§10-4) ─────────────────────────────────────────
{
  // 25조합(5×5)이 다섯 갈래로 빠짐없이 나뉜다
  for (const d of C.ELEMENTS) {
    for (const l of C.ELEMENTS) {
      const rel = computeRelation(d, l);
      check(`관계 판정은 5종 중 하나 (${d}→${l})`, RELATIONS.includes(rel), rel);
    }
    // 자기 자신은 항상 비겁
    eq(`${d}→${d} = 비겁`, computeRelation(d, d), "비겁");
  }

  // 원문 예시(§5 조합 예시)와 정확히 일치해야 한다
  eq("경금(金) 부족오행 수 → 식상", computeRelation("金", "水"), "식상");
  eq("갑목(木) 부족오행 수 → 인성", computeRelation("木", "水"), "인성");
  eq("병화(火) 부족오행 수 → 관성", computeRelation("火", "水"), "관성");
  eq("임수(水) 부족오행 수 → 비겁", computeRelation("水", "水"), "비겁");
  eq("무토(土) 부족오행 수 → 재성", computeRelation("土", "水"), "재성");

  // 핸드오프 §2 예시 3종 재확인
  eq("금 일간 + 수 = 식상(내 기운이 흘러나가는 통로)", computeRelation("金", "水"), "식상");
  eq("목 일간 + 수 = 인성(나를 받쳐주는 기반)", computeRelation("木", "水"), "인성");
  eq("화 일간 + 수 = 관성(나를 규율하는 틀)", computeRelation("火", "水"), "관성");

  // 5관계 사전 — 4블록(결핍/증상/채워졌을 때/주의) 전부 존재
  for (const rel of RELATIONS) {
    const e = relationEntry(rel);
    check(`[${rel}] deficiency 존재`, e.deficiency.length > 0);
    check(`[${rel}] symptoms 4개`, e.symptoms.length === 4, `${e.symptoms.length}개`);
    check(`[${rel}] whenFilled 존재`, e.whenFilled.length > 0);
    check(`[${rel}] caution 존재`, e.caution.length > 0);
  }

  // 재성만 일간 강약 확인이 필요하다 (§2-③ 주의점)
  eq("재성만 requiresStrengthCheck", RELATIONS.filter((r) => relationEntry(r).requiresStrengthCheck), ["재성"]);

  // 축 우선순위 — 4개 반환, 중복 없음, 전부 유효한 A층 축
  for (const rel of RELATIONS) {
    const axes4 = axisPriority(rel, 4);
    eq(`[${rel}] 축 4개 반환`, axes4.length, 4);
    eq(`[${rel}] 축 중복 없음`, new Set(axes4).size, 4);
    check(`[${rel}] 전부 유효한 A층 축`, axes4.every((a) => AXES.includes(a)));
  }
  // 인성·관성·비겁은 "사람"이 1순위 실행 축 — B층 사람 섹션이 크게 다뤄야 하는 관계
  eq("사람 1순위 관계 = 인성·관성·비겁", RELATIONS.filter(peopleAxisIsPrimary).sort(), ["관성", "비겁", "인성"].sort());
  check("식상은 사람이 1순위 아님(행동이 1순위)", !peopleAxisIsPrimary("식상"));

  // 일간 강약 연동 — 재다신약이면 재성보다 비겁·인성을 먼저 세운다
  {
    const weak = buildChart(CASES[2].iso, "F", true); // C케이스: 신약(身弱)
    check("[C] 신약 확인", !weak.strength.is_strong, weak.strength.verdict);
    const adj = adjustForStrength("재성", weak.day_master_element, weak.strength);
    check("[C] 신약+재성 → 조정 필요", adj.needed);
    check("[C] preferFirst에 일간 오행 포함", adj.preferFirst.includes(weak.day_master_element));

    const strong = buildChart(CASES[0].iso, "M", true); // A케이스: 신강
    const adj2 = adjustForStrength("재성", strong.day_master_element, strong.strength);
    check("[A] 신강+재성 → 조정 불필요", !adj2.needed);

    // 재성이 아닌 관계는 신약이어도 조정하지 않는다
    const adj3 = adjustForStrength("식상", weak.day_master_element, weak.strength);
    check("[C] 신약+식상 → 조정 대상 아님(재성 전용)", !adj3.needed);
  }

  // 상대 일간 가이드 — 부족 오행을 채워 줄 상대가 나에게 어떤 관계인지
  {
    const g = partnerGuide("金", "水"); // 금 일간, 수 부족 → 상대가 수 일간이면 식상 관계
    eq("금 일간의 수 부족 → 상대는 식상 관계", g.relation, "식상");
    check("가이드에 effect·fitFor 존재", !!g.effect && !!g.fitFor);
  }

  // 관찰 블록 — 톤 규칙과 안내 문구가 항상 함께 나간다
  {
    const obs = observationGuide("水");
    eq("관찰 5행", obs.rows.length, 5);
    eq("강조 오행 1개만 true", obs.rows.filter((r) => r.emphasized).length, 1);
    check("강조된 것은 요청한 오행(水)", obs.rows.find((r) => r.emphasized)?.element === "水");
    check("톤 규칙 문구 항상 포함", obs.toneRule.includes("단정하지 말"));
    check("사용 안내 문구 항상 포함", obs.mustInclude.includes("단정하지 말"));

    const noHighlight = observationGuide(null);
    eq("강조 없음 → 전부 false", noHighlight.rows.filter((r) => r.emphasized).length, 0);
  }

  // 피해야 할 조건 — "절연이 아니다" 고지가 데이터에 항상 붙어 있어야 한다
  check("avoid.mustInclude에 절연 아님 명시", relationDict.people.avoid.mustInclude.includes("절연"));
  eq("avoid 조건 2개", relationDict.people.avoid.conditions.length, 2);

  // 관계 유형별 적용 4종 (배우자·동업자·상사·친구)
  eq("관계 유형 4종", relationDict.people.byRelationType.map((r) => r.type), ["배우자·연인", "동업자", "상사·조직", "친구"]);
}

// ── 3년 세운 처방 (§10-5) ────────────────────────────────────────────
{
  // 케이스 판정 순수 함수 — 우선순위 A > B > D > C > E (문서 §1-3)
  eq("Y=L → A (직접 일치가 최우선)", classifySeunCase("水", "木", "水", ["水"]), "A");
  eq("Y=X → B (과다와 일치)", classifySeunCase("火", "木", "水", ["火"]), "B");
  eq("Y 생 L → C", classifySeunCase("金", "木", "水", []), "C"); // 금생수
  eq("Y 극 L → D", classifySeunCase("土", "木", "水", []), "D"); // 토극수
  eq("무관 → E", classifySeunCase("木", "木", "水", []), "E"); // 목은 수와 생극 무관(비겁 관계는 세운엔 해당 없음)
  eq("primary 없음(균형형) → A/C/D 성립 불가, E로", classifySeunCase("金", "木", null, []), "E");
  eq("primary 없음 + 과다 일치 → B는 성립", classifySeunCase("火", "木", null, ["火"]), "B");
  // 문서 §1-3 예시: Y가 부족 오행이면서 동시에 과다 오행을 생하는 경우도 A
  eq("Y=L 이면서 Y가 과다를 생해도 A가 우선", classifySeunCase("水", "木", "水", ["木"]), "A");
  // 두 오행(천간·지지)이 섞인 해 — 하나만 맞아도 그 케이스
  eq("지지만 L과 일치해도 A", classifySeunCase("金", "水", "水", []), "A");

  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const plan = buildSeunPrescription(chart, cls, 2026);

    eq(`[${c.name}] 세운 3년`, plan.years.length, 3);
    for (const y of plan.years) {
      check(`[${c.name}] ${y.year} 케이스는 5종 중 하나`, ["A", "B", "C", "D", "E"].includes(y.seunCase));
      check(`[${c.name}] ${y.year} incoming 1~2개`, y.incoming.length >= 1 && y.incoming.length <= 2);
      check(`[${c.name}] ${y.year} statusLine 존재`, y.statusLine.length > 0);
      check(`[${c.name}] ${y.year} guidelineLine 존재`, y.guidelineLine.length > 0);
      // 고정 풀에서만 뽑혔는지 — 임의 생성 금지(§1-8) 확인
      const pool = seunCopyPools[y.seunCase];
      check(`[${c.name}] ${y.year} status는 고정 풀 소속`, pool.status.includes(y.statusLine));
      check(`[${c.name}] ${y.year} guideline은 고정 풀 소속`, pool.guideline.includes(y.guidelineLine));
      check(`[${c.name}] ${y.year} 우선 항목 3개 이하`, y.priorityItems.length <= 3);
      check(`[${c.name}] ${y.year} 피할 것 2개 이하`, y.avoidItems.length <= 2);
      check(`[${c.name}] ${y.year} 우선 항목에 실행란 존재`, y.priorityItems.every((it) => !!it.action));
    }
    check(`[${c.name}] 대운 안내는 교체·배경 동시 성립 안 함`, !(plan.daewoonNote.background && plan.daewoonNote.transition));
    if (plan.daewoonNote.transition) {
      check(`[${c.name}] 전환 안내는 연도를 못 박지 않음(나이만)`, /\d+세 무렵/.test(plan.daewoonNote.transition));
      check(`[${c.name}] 전환 안내에 4자리 연도 없음`, !/\d{4}/.test(plan.daewoonNote.transition));
    }

    // 결정성
    const plan2 = buildSeunPrescription(chart, cls, 2026);
    eq(`[${c.name}] 세운 처방 결정적`, JSON.stringify(plan), JSON.stringify(plan2));
  }

  // A케이스는 3년 창에서 대운이 바뀐다(37세) — 전환 안내 문구 확인
  {
    const chart = buildChart(CASES[0].iso, "M", true);
    const plan = buildSeunPrescription(chart, classify(chart), 2026);
    eq("[A] 전환 안내", plan.daewoonNote.transition, "37세 무렵 대운이 乙酉(을유)로 바뀝니다");
  }
  // C케이스는 3년 내내 같은 대운
  {
    const chart = buildChart(CASES[2].iso, "F", true);
    const plan = buildSeunPrescription(chart, classify(chart), 2026);
    eq("[C] 배경 안내", plan.daewoonNote.background, "지금은 戊戌(무술) 대운 안입니다");
  }

  // D케이스 우선 항목은 회피 1개를 낄 과다 오행이 없어도 항상 3개(폴백 확인)
  {
    const chart = buildChart(CASES[0].iso, "M", true); // A는 excessive=[]
    const cls = classify(chart);
    eq("[A] 과다 오행 없음(폴백 검증 전제)", cls.excessive.length, 0);
    const plan = buildSeunPrescription(chart, cls, 2026);
    const dYear = plan.years.find((y) => y.seunCase === "D");
    check("[A] D케이스 연도 존재(폴백 검증 전제)", !!dYear);
    if (dYear) eq("[A] D케이스도 우선 항목 3개(과다 오행 없어도)", dYear.priorityItems.length, 3);
  }
}

// ── 한 줄 진단 (§10-5) ───────────────────────────────────────────────
{
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const dx = buildDiagnosis(chart, cls);

    check(`[${c.name}] 헤드라인은 굵게(** **) 감싸짐`, dx.headline.startsWith("**") && dx.headline.endsWith("**"));
    check(`[${c.name}] facts 1개 이상`, dx.facts.length > 0);
    eq(`[${c.name}] pattern은 classify 패턴과 대응`, dx.pattern, cls.pattern === "extreme" ? "extreme" : cls.pattern === "biased" ? "biased2" : cls.primary ? "scarce1" : "balanced");

    // 결정성
    const dx2 = buildDiagnosis(chart, cls);
    eq(`[${c.name}] 진단 결정적`, JSON.stringify(dx), JSON.stringify(dx2));
  }

  // 극단형 헤드라인 — 표본에서 찾은 극단형 사주로 형식 확인
  {
    let found: { chart: ReturnType<typeof buildChart>; cls: ReturnType<typeof classify> } | null = null;
    outer2: for (let y = 1970; y <= 2005 && !found; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          const cls = classify(chart);
          if (cls.pattern === "extreme") { found = { chart, cls }; break outer2; }
        }
      }
    }
    check("극단형 표본 존재", !!found);
    if (found) {
      const dx = buildDiagnosis(found.chart, found.cls);
      eq("극단형 pattern", dx.pattern, "extreme");
      check("극단형 헤드라인에 '하나로 강하게 모인'", dx.headline.includes("하나로 강하게 모인"));
      check("극단형 relation 존재", dx.relation !== null);
    }
  }

  // 받침 있는 오행(목·금)의 조사가 "가/와"로 잘못 나가지 않는지 — 실측 케이스로 확인
  // (A: primary=木 단독 → "목이", B: primary=木+secondary=火 → "목과", C: primary=金 단독 → "금이")
  {
    // 괄호 뒤에 조사가 붙는 형태라 "木(목)이"처럼 실제로는 "목)이"로 이어진다
    const a = buildDiagnosis(buildChart(CASES[0].iso, "M", true), classify(buildChart(CASES[0].iso, "M", true)));
    check("[A] 목 받침 조사 '이' 사용, '가' 없음", a.headline.includes("목)이") && !a.headline.includes("목)가"));
    const b = buildDiagnosis(buildChart(CASES[1].iso, "F", false), classify(buildChart(CASES[1].iso, "F", false)));
    check("[B] 목 받침 조사 '과' 사용, '와' 없음", b.headline.includes("목)과") && !b.headline.includes("목)와"));
    const cc = buildDiagnosis(buildChart(CASES[2].iso, "F", true), classify(buildChart(CASES[2].iso, "F", true)));
    check("[C] 금 받침 조사 '이' 사용, '가' 없음", cc.headline.includes("금)이") && !cc.headline.includes("금)가"));
  }
}

// ── /guide/fill-* 배너 (§10-5) ───────────────────────────────────────
{
  eq("배너 대상 5편", Object.keys(FILL_ARTICLE_ELEMENT).sort(), ["fill-earth", "fill-fire", "fill-metal", "fill-water", "fill-wood"].sort());
  for (const [slug, el] of Object.entries(FILL_ARTICLE_ELEMENT)) {
    const copy = wuxingBannerCopy(el);
    check(`[${slug}] title에 오행명 포함`, copy.title.includes(C.ELEMENT_KR[el]));
    check(`[${slug}] body에 오행명 포함`, copy.body.includes(C.ELEMENT_KR[el]));
    check(`[${slug}] cta 문구 확정본과 일치`, copy.cta === "내 사주로 확인하기 · 990원");
    check(`[${slug}] subCta 확정본과 일치`, copy.subCta === "부족 여부 판정 · 3년 세운 처방 · 어떤 사람이 맞는지까지");
    check(`[${slug}] href는 프리미엄 라우트`, copy.href.startsWith("/premium/"));
  }
}

// ── 결과 ───────────────────────────────────────────────────────────
console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
