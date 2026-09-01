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
  buildRelationIntroLine,
  buildRelationDisplayBlock,
} from "./relation";
import { buildSeunPrescription, classifySeunCase } from "./seun-prescription";
import { buildSeunNarrativePrompt, validateSeunNarrative } from "./seun-narrative";
import { buildDiagnosis, type DiagnosisSkeleton } from "./diagnosis";
import { buildDiagnosisNarrativePrompt, validateDiagnosisNarrative } from "./diagnosis-narrative";
import { wuxingBannerCopy, FILL_ARTICLE_ELEMENT } from "./banner";
import {
  CIRCLE_ORDER,
  ELEMENT_COLOR,
  buildCircleLayout,
  edgeEndpoints,
  edgeStyleFor,
  nodeStyleFor,
  buildEdges,
  buildAriaSummary,
} from "./circle-diagram";
import {
  largestRemainderPercents,
  tierOf,
  TIER_LABEL,
  buildElementBars,
  buildImbalanceRows,
  buildYongsinCard,
  buildWuxingMap,
} from "./map-section";
import {
  buildFillSection,
  buildPeopleSection,
  buildDrainSection,
  buildClosingSection,
  buildWuxingReport,
  countFillItems,
} from "./report";
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

  // caution에 집필 지침이 섞여 있으면 LLM이 그 문장 자체를 리포트에 출력할 위험이 있다
  // (실측 발견: 관성·재성). "~할 것"/"~말 것" 같은 지시문 어미가 caution 본문에 남아있지
  // 않은지 전 관계에서 확인한다. writerNote는 별도 필드라 이 검사에서 제외된다.
  {
    const directivePattern = /할 것|말 것|피한다\.?$/;
    for (const rel of RELATIONS) {
      const e = relationEntry(rel);
      check(`[${rel}] caution에 집필 지침 문장 없음`, !directivePattern.test(e.caution), e.caution);
    }
    check("관성 writerNote로 톤 지침 이전됨", !!relationEntry("관성").writerNote?.includes("판단 톤을 피한다"));
    check("재성 writerNote로 코드화 안내 이전됨", !!relationEntry("재성").writerNote?.includes("adjustForStrength"));
  }

  // B층 노출 방식 A안(CEO 확정) — relation.json을 그대로 노출하되 존댓말·writerNote
  // 배제가 실제로 지켜지는지 확인한다.
  {
    // 5블록 전부 존댓말 종결어미인지 — "-습니다/-입니다/-ㅂ니다" 계열만 허용.
    // "다"로 끝나되 그 앞이 "니"가 아니면(예: "~된다", "~간다") 평서체가 남은 것이다.
    const informalEnding = /(?<!니)다[.]?$/;
    for (const rel of RELATIONS) {
      const e = relationEntry(rel);
      const sentences = [e.deficiency, e.whenFilled, e.caution, ...e.symptoms]
        .flatMap((block) => block.split(/(?<=[.!?])\s*/))
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of sentences) {
        check(`[${rel}] 존댓말 종결 — "${s}"`, !informalEnding.test(s), s);
      }
    }

    // buildRelationDisplayBlock — writerNote가 구조적으로 빠지는지 확인.
    // JSON.stringify까지 훑어 문자열 형태로도 안 섞여 있는지 이중 확인한다.
    for (const dEl of C.ELEMENTS) {
      for (const lEl of C.ELEMENTS) {
        const block = buildRelationDisplayBlock(dEl, lEl);
        check(`[${dEl}→${lEl}] writerNote 키 없음`, !("writerNote" in block));
        const dump = JSON.stringify(block);
        check(`[${dEl}→${lEl}] 직렬화에도 writerNote 문구 없음`, !dump.includes("판단 톤을 피한다") && !dump.includes("adjustForStrength"));
      }
    }

    // 1문장 템플릿 — CEO 확정 형태 그대로("당신에게 부족한 오행은 X이며, Y 일간에게 Z에 해당합니다.")
    eq(
      "인트로 템플릿(금 일간·수 부족 → 식상)",
      buildRelationIntroLine("金", "水"),
      "당신에게 부족한 오행은 수(水)이며, 금(金) 일간에게 식상에 해당합니다."
    );
    eq(
      "인트로 템플릿(목 일간·수 부족 → 인성)",
      buildRelationIntroLine("木", "水"),
      "당신에게 부족한 오행은 수(水)이며, 목(木) 일간에게 인성에 해당합니다."
    );
    check("인트로 템플릿에 오행명·일간·관계명 전부 포함", buildRelationDisplayBlock("金", "水").intro === buildRelationIntroLine("金", "水"));
  }

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

// ── 3년 흐름 한 문단 — 프롬프트 조립·검증기 (§1-4, API 호출 없이 오프라인 검증) ──
{
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const plan = buildSeunPrescription(chart, cls, 2026);
    const prompt = buildSeunNarrativePrompt(chart, cls, plan);

    check(`[${c.name}] 프롬프트에 3년 연도 전부 포함`, plan.years.every((y) => prompt.includes(String(y.year))));
    check(`[${c.name}] 프롬프트에 케이스 라벨 전부 포함`, plan.years.every((y) => prompt.includes(y.caseLabel)));
    check(`[${c.name}] 프롬프트에 대운 안내 포함`, prompt.includes(plan.daewoonNote.transition ?? plan.daewoonNote.background ?? "대운 정보 없음"));
    check(`[${c.name}] 프롬프트에 공통 RULES 포함`, prompt.includes("사건 예측 금지"));
    check(`[${c.name}] 프롬프트에 JSON 스키마 지시 포함`, prompt.includes('{"narrative"'));
    // scoreYear()의 사건 뉘앙스 문구(yearNotes)는 애초에 YearPrescription에 없으므로
    // 구조적으로 새어 들어올 수 없다 — 그래도 흔한 문구가 프롬프트에 없는지 이중 확인
    check(`[${c.name}] yearNotes류 문구 없음("주의"·"충"·"합" 단독 사건 서술)`, !prompt.includes("변동·갈등 주의") && !prompt.includes("이동·변화·건강 주의"));
  }

  // 검증기 — 프롬프트 RULES 위반을 실제로 잡아내는지 (API 호출 없이 문자열만 테스트)
  eq("정상 존댓말 문단 → 문제 없음", validateSeunNarrative("올해는 채우기 좋은 해입니다. 내년에는 대운이 바뀌며 흐름이 달라집니다."), []);
  check("마크다운 기호 검출", validateSeunNarrative("**중요**합니다.").includes("마크다운 기호 포함"));
  check("금지 표현 검출", validateSeunNarrative("이 분석 시스템이 계산했습니다.").some((i) => i.includes("분석 시스템")));
  check("평서체 종결 검출", validateSeunNarrative("올해는 채우는 해다.").some((i) => i.startsWith("존댓말 아님")));
  check("4문장 초과 검출", validateSeunNarrative("첫째입니다. 둘째입니다. 셋째입니다. 넷째입니다. 다섯째입니다.").some((i) => i.includes("문장")));
  check("빈 문단 검출", validateSeunNarrative("").includes("빈 문단"));

  // §1-7 완충 표기 위반 — 대운 전환에 확정 연도를 박은 서술 차단
  {
    const bad1 = validateSeunNarrative("2027년에 대운이 바뀝니다.");
    check("확정 연도 대운 전환 검출 — 기본형", bad1.some((i) => i.includes("§1-7")));

    const bad2 = validateSeunNarrative("올해는 채우는 해입니다. 2028년부터 대운이 새로 시작됩니다.");
    check("확정 연도 대운 전환 검출 — '~부터 시작됩니다' 변형", bad2.some((i) => i.includes("§1-7")));

    const bad3 = validateSeunNarrative("대운이 2029년에 전환됩니다.");
    check("확정 연도 대운 전환 검출 — 어순이 달라도 검출", bad3.some((i) => i.includes("§1-7")));

    // 완충 표현("무렵")이 있으면 정상 통과 — 요구된 형식 그대로
    eq("나이 무렵 형식은 통과", validateSeunNarrative("37세 무렵 대운이 바뀝니다."), []);

    // 실제 API 결과(2026-08-31 실측, A케이스) — "무렵" 있는 정상 대운 전환 서술이
    // 오탐되지 않는지 회귀 고정
    eq(
      "실측 A케이스 전문 — 오탐 없음",
      validateSeunNarrative(
        "2026년 丙午(병오)와 2027년 丁未(정미)는 연달아 고른 해로 이어지는 구간으로, 외부 변수가 적고 큰 흐름 없이 평탄한 만큼 당신의 페이스대로 습관을 다져 나가기에 좋은 시간입니다. 그러나 2028년 戊申(무신)에는 부족한 목(木)을 치는 토(土)·금(金)의 기운이 들어오며 격차가 벌어지는 해로 바뀌기 때문에, 앞선 두 해에 쌓은 습관과 내실이 그대로 완충재가 되어 줄 것이며 무리하지 않는 것이 최선입니다. 한편 37세 무렵 대운이 乙酉(을유)로 바뀌는 전환점이 이 시기 가까이 놓여 있으므로, 지금 이 3년은 그 변화를 앞두고 스스로를 고르게 정비해 두는 구간으로 삼으시길 권합니다."
      ),
      []
    );

    // 실제 API 결과(2026-08-31 실측, C케이스) — 대운이 "안 바뀌는" 배경 서술이면서
    // 세운 연도가 같은 문장에 섞여 있는 정상 케이스. "대운"과 "20XX년"이 한 문장에
    // 같이 있지만 전환 동사가 없으므로 오탐되면 안 된다(§1-7 규칙의 핵심 판별 지점)
    eq(
      "실측 C케이스 전문 — 대운·연도 동시 등장이지만 전환 아님, 오탐 없음",
      validateSeunNarrative(
        "2026년 丙午(병오)년과 2027년 丁未(정미)년은 연달아 화(火)와 토(土)의 기운이 들어오는 해로, 명리학적으로 보면 당신에게 부족한 금(金)의 기운을 치는 쪽이 이어지는 구간입니다. 이 두 해 동안은 평소 약하던 부분이 유난히 드러나고 격차가 벌어지는 흐름이기에, 무리하지 않는 것이 최선입니다. 그 버티는 구간을 지나 2028년 戊申(무신)년이 되면 토(土)와 금(金)이 함께 들어오며 비어 있던 자리가 저절로 채워지는 해가 되니, 지금 戊戌(무술) 대운 안에서 미뤄두었던 것을 꺼내기에 비로소 적절한 때가 찾아옵니다."
      ),
      []
    );
  }
}

// ── 한 줄 진단 보충 2문장 — 프롬프트 조립·검증기 (§2-3, API 호출 없이 오프라인 검증) ──
{
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const dx = buildDiagnosis(chart, cls);
    const prompt = buildDiagnosisNarrativePrompt(dx);

    check(`[${c.name}] 프롬프트에 헤드라인(** 제거) 포함`, prompt.includes(dx.headline.replace(/\*\*/g, "")));
    check(`[${c.name}] 프롬프트에 facts 전부 포함`, dx.facts.every((f) => prompt.includes(f)));
    check(`[${c.name}] 프롬프트에 공통 RULES 포함`, prompt.includes("사건 예측 금지"));
    check(`[${c.name}] 프롬프트에 JSON 스키마 지시 포함`, prompt.includes('{"sentence1"'));
    if (dx.relation) {
      check(`[${c.name}] 프롬프트에 관계 라벨 포함`, prompt.includes(dx.relation.label));
      check(`[${c.name}] 프롬프트에 "베끼지 말 것" 경고 포함`, prompt.includes("베끼지 말 것"));
    }
  }

  // 균형형(relation=null) 방어 경로 — 8·6글자 사주에서는 수학적으로 나올 수 없지만
  // (5오행이 전부 표면 2개 이상이려면 최소 10글자가 필요한데 8·6글자뿐이라 모순),
  // classify.ts가 방어적으로 만들어 둔 값이라 프롬프트 조립도 안전한지는 확인해 둔다.
  {
    const fakeBalanced: DiagnosisSkeleton = {
      pattern: "balanced",
      headline: "**다섯 기운이 고르게 갖춰진 사주**",
      facts: ["월지는 오(午)다", "일간은 甲(갑) — 木(목) 오행이다"],
      relation: null,
    };
    const prompt = buildDiagnosisNarrativePrompt(fakeBalanced);
    check("균형형 프롬프트에 '고르게 갖춰져' 대체 문구 포함", prompt.includes("고르게 갖춰져"));
    check("균형형 프롬프트는 relation 라벨을 요구하지 않음", !prompt.includes("undefined"));
  }

  // 검증기 — RULES 위반을 실제로 잡아내는지
  eq("정상 2문장 → 문제 없음", validateDiagnosisNarrative({ pattern: "scarce1", headline: "", facts: [], relation: null }, {
    sentence1: "일간은 경(庚)입니다.",
    sentence2: "이것은 식상에 해당합니다.",
  }), []);
  check("마크다운 검출", validateDiagnosisNarrative({ pattern: "scarce1", headline: "", facts: [], relation: null }, {
    sentence1: "**중요**합니다.", sentence2: "그렇습니다.",
  }).some((i) => i.includes("마크다운")));
  check("금지 표현 검출", validateDiagnosisNarrative({ pattern: "scarce1", headline: "", facts: [], relation: null }, {
    sentence1: "이 알고리즘이 계산했습니다.", sentence2: "그렇습니다.",
  }).some((i) => i.includes("알고리즘")));
  check("평서체 종결 검출", validateDiagnosisNarrative({ pattern: "scarce1", headline: "", facts: [], relation: null }, {
    sentence1: "그렇다.", sentence2: "그렇습니다.",
  }).some((i) => i.includes("존댓말 아님")));
  check("문장 수 초과 검출", validateDiagnosisNarrative({ pattern: "scarce1", headline: "", facts: [], relation: null }, {
    sentence1: "첫째입니다. 둘째입니다.", sentence2: "그렇습니다.",
  }).some((i) => i.includes("문장")));

  // B층 원문 통째 복사 검출
  {
    const dxWithRelation: DiagnosisSkeleton = {
      pattern: "scarce1",
      headline: "",
      facts: [],
      relation: buildRelationDisplayBlock("金", "水"),
    };
    const copied = validateDiagnosisNarrative(dxWithRelation, {
      sentence1: "설명입니다.",
      sentence2: dxWithRelation.relation!.deficiency, // 원문 그대로 복사
    });
    check("B층 원문 그대로 복사 시 검출", copied.some((i) => i.includes("복사")));

    const paraphrased = validateDiagnosisNarrative(dxWithRelation, {
      sentence1: "설명입니다.",
      sentence2: "이 부분은 뒤에서 더 자세히 다룹니다.",
    });
    eq("정상 요약(원문 아님)은 통과", paraphrased, []);
  }

  // 실제 API 결과(2026-08-31 실측) 회귀 고정 — 오탐 없이 통과해야 한다
  {
    const chartA = buildChart(CASES[0].iso, CASES[0].gender, CASES[0].hasHour);
    const dxA = buildDiagnosis(chartA, classify(chartA));
    eq(
      "실측 A케이스(scarce1) — 오탐 없음",
      validateDiagnosisNarrative(dxA, {
        sentence1: "여덟 글자의 표면 어디에도 木(목)이 드러나지 않고, 辰(진) 지지 속 乙(을)에만 숨어 있어 당신의 사주에서 木은 사실상 비어 있는 오행입니다.",
        sentence2: "명리학적으로 보면 庚(경) 일간에게 木은 재성에 해당하는데, 이것이 비어 있다는 것이 당신에게 무엇을 뜻하는지는 아래 풀이에서 자세히 설명합니다.",
      }),
      []
    );

    const chartB = buildChart(CASES[1].iso, CASES[1].gender, CASES[1].hasHour);
    const dxB = buildDiagnosis(chartB, classify(chartB));
    eq(
      "실측 B케이스(biased2) — 오탐 없음",
      validateDiagnosisNarrative(dxB, {
        sentence1: "명리학적으로 보면, 여덟 글자 표면에서 木(목)과 火(화)가 보이지 않고 — 목은 辰(진) 지지 안에 乙(을)이 숨어 있을 뿐이며 화는 표면과 지장간 어디에도 존재하지 않아 — 당신의 사주는 두 오행이 구조적으로 비어 있는 형태입니다.",
        sentence2: "이 빈자리 중에서도 특히 식상에 해당하는 오행의 부재는, 당신 안에 무엇이 쌓이고 무엇이 막히는가를 이해하는 핵심 열쇠가 되며, 그 의미는 뒤쪽에서 더 깊이 다루겠습니다.",
      }),
      []
    );
  }
}

// ── 오행 상생상극 원형도 (§2 오행 지도, 순수 로직만 — JSX는 여기서 검증 안 함) ──
{
  // 팔레트 — dataviz 스킬 검증기(all-pairs, light) 통과 확인은 별도로 실행했다.
  // 여기서는 5개 오행 전부 색이 있고, 하드코딩 순서가 상생 순서와 일치하는지만 확인
  eq("원 배치 순서 = 상생 순서", CIRCLE_ORDER, ["木", "火", "土", "金", "水"]);
  for (const el of C.ELEMENTS) {
    check(`[${el}] 팔레트 색상 존재`, /^#[0-9a-fA-F]{6}$/.test(ELEMENT_COLOR[el]));
  }
  eq("팔레트 5색 전부 다름", new Set(Object.values(ELEMENT_COLOR)).size, 5);

  // 레이아웃 — 5개 노드가 중심에서 등거리, 서로 다른 위치
  {
    const layout = buildCircleLayout();
    const positions = CIRCLE_ORDER.map((el) => layout.positions[el]);
    for (const p of positions) {
      const dist = Math.hypot(p.x - layout.cx, p.y - layout.cy);
      check("노드는 중심에서 반지름만큼 떨어짐", Math.abs(dist - layout.radius) < 0.01, `${dist} vs ${layout.radius}`);
    }
    const uniqueX = new Set(positions.map((p) => Math.round(p.x * 100)));
    check("5개 노드 위치가 서로 다름", uniqueX.size >= 4); // 정오각형이라 x좌표 일부 대칭 가능, 완전 유일성은 y까지 봐야 함
    const uniqueXY = new Set(positions.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
    eq("5개 노드 위치 전부 유일(x,y 쌍)", uniqueXY.size, 5);
  }

  // 엣지 스타일 — 4단계가 THRESHOLD와 정확히 일치
  {
    eq("0개 → absent(점선·최소)", edgeStyleFor(0), { tier: "absent", dashed: true, strokeWidth: 1, opacity: 0.35 });
    eq("1개 → scarce(점선·중간)", edgeStyleFor(1), { tier: "scarce", dashed: true, strokeWidth: 1.4, opacity: 0.55 });
    eq("2개 → normal(실선)", edgeStyleFor(2), { tier: "normal", dashed: false, strokeWidth: 2.2, opacity: 1 });
    eq("3개 → normal(실선, mildlyMany 경계)", edgeStyleFor(THRESHOLD.mildlyMany), { tier: "normal", dashed: false, strokeWidth: 2.2, opacity: 1 });
    eq("4개 → excessive(실선·굵게)", edgeStyleFor(THRESHOLD.excessive), { tier: "excessive", dashed: false, strokeWidth: 3.2, opacity: 1 });
    eq("7개 → excessive 그대로(상한 없음)", edgeStyleFor(7).tier, "excessive");
    // 절대 실선이면서 점선 플래그가 true인 모순은 없어야 한다
    for (let n = 0; n <= 8; n++) {
      const s = edgeStyleFor(n);
      check(`n=${n} dashed/실선 모순 없음`, s.dashed === (s.tier === "absent" || s.tier === "scarce"));
    }
  }

  // 노드 스타일 — 같은 4단계 어휘, absent만 dashed
  {
    eq("0개 → 노드도 점선", nodeStyleFor(0).dashed, true);
    eq("1개 → 노드도 점선", nodeStyleFor(1).dashed, true);
    eq("2개 → 노드는 실선", nodeStyleFor(2).dashed, false);
    eq("4개 → 노드 링이 가장 굵음", nodeStyleFor(4).strokeWidth, 4);
  }

  // buildEdges — 상생 5 + 상극 5 = 10개, 전부 CIRCLE_ORDER 안의 원소끼리만 연결
  {
    const surface = { 木: 0, 火: 3, 土: 2, 金: 1, 水: 5 };
    const edges = buildEdges(surface);
    eq("엣지 총 10개(상생5+상극5)", edges.length, 10);
    eq("상생 5개", edges.filter((e) => e.kind === "생").length, 5);
    eq("상극 5개", edges.filter((e) => e.kind === "극").length, 5);
    check("모든 엣지의 from/to가 CIRCLE_ORDER 안에 있음", edges.every((e) => CIRCLE_ORDER.includes(e.from) && CIRCLE_ORDER.includes(e.to)));
    check("자기 자신으로 가는 엣지 없음", edges.every((e) => e.from !== e.to));
    // 木이 0개(부재)이므로 木에서 나가는 엣지(생·극 각 1개=2개)는 dashed
    const fromMok = edges.filter((e) => e.from === "木");
    eq("木(0개)에서 나가는 엣지 2개", fromMok.length, 2);
    check("木에서 나가는 엣지는 전부 점선", fromMok.every((e) => e.style.dashed));
    // 水가 5개(과다)이므로 水에서 나가는 엣지는 굵은 실선
    const fromSu = edges.filter((e) => e.from === "水");
    check("水(5개)에서 나가는 엣지는 전부 굵은 실선", fromSu.every((e) => e.style.tier === "excessive" && !e.style.dashed));
  }

  // edgeEndpoints — 노드 반지름만큼 물려서 시작·끝점이 노드 중심과 겹치지 않음
  {
    const layout = buildCircleLayout();
    const p = edgeEndpoints(layout, "木", "火");
    const startDist = Math.hypot(p.x1 - layout.positions["木"].x, p.y1 - layout.positions["木"].y);
    const endDist = Math.hypot(p.x2 - layout.positions["火"].x, p.y2 - layout.positions["火"].y);
    check("시작점이 노드 중심에서 반지름 이상 떨어짐", startDist >= layout.nodeRadius);
    check("끝점이 노드 중심에서 반지름 이상 떨어짐(화살촉 여유 포함)", endDist >= layout.nodeRadius);
  }

  // ARIA 요약 — 부재·과다 오행이 실제로 언급되는지
  {
    const summary = buildAriaSummary({ 木: 0, 火: 3, 土: 2, 金: 1, 水: 5 });
    check("아리아 요약에 부재 오행(목) 언급", summary.includes("목"));
    check("아리아 요약에 과다 오행(수) 언급", summary.includes("수"));

    const balancedSummary = buildAriaSummary({ 木: 2, 火: 2, 土: 2, 金: 2, 水: 2 });
    check("전부 정상이면 '고르게' 문구", balancedSummary.includes("고르게"));
  }
}

// ── §2 오행 지도 — 분포 막대·불균형 진단표·용신 카드 ────────────────
{
  // 최대잔여법 — 정수 백분율 합계가 항상 정확히 100이어야 한다.
  // 단순 반올림이면 8글자 0/2/2/3/1이 0+25+25+38+13=101%로 새어 나간다.
  {
    eq("8글자 0·2·2·3·1 → 합계 100", largestRemainderPercents([0, 2, 2, 3, 1]).reduce((a, b) => a + b, 0), 100);
    eq("6글자 0·0·3·0·3 → 합계 100", largestRemainderPercents([0, 0, 3, 0, 3]).reduce((a, b) => a + b, 0), 100);
    eq("균등 8글자 → 합계 100", largestRemainderPercents([2, 2, 2, 1, 1]).reduce((a, b) => a + b, 0), 100);
    eq("0개는 0%", largestRemainderPercents([0, 2, 2, 3, 1])[0], 0);
    eq("전부 0이면 전부 0%(0으로 나누기 방어)", largestRemainderPercents([0, 0, 0, 0, 0]), [0, 0, 0, 0, 0]);
    // 실제 명식 전수 — 어떤 사주에서도 합계가 100을 벗어나면 안 된다
    for (let y = 1970; y <= 2005; y += 4) {
      for (let m = 1; m <= 12; m++) {
        for (const hasHour of [true, false]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-11T09:00:00`;
          const cnt = countElements(buildChart(iso, "M", hasHour));
          const bars = buildElementBars(cnt);
          const sum = bars.reduce((a, b) => a + b.percent, 0);
          check(`백분율 합계 100 (${y}-${m}, hour=${hasHour})`, sum === 100, `${sum}%`);
        }
      }
    }
  }

  // 등급 판정 — THRESHOLD와 정확히 일치, 5개 이상도 "과다"까지만(극단 라벨 누출 금지)
  {
    eq("0개 → 부재", tierOf(0), "absent");
    eq("1개 → 부족", tierOf(1), "scarce");
    eq("2개 → 적정", tierOf(2), "normal");
    eq("3개 → 다소 많음", tierOf(THRESHOLD.mildlyMany), "mildlyMany");
    eq("4개 → 과다", tierOf(THRESHOLD.excessive), "excessive");
    eq("5개(극단형 후보)도 라벨은 과다", tierOf(THRESHOLD.extremeDominant), "excessive");
    eq("7개도 과다", tierOf(7), "excessive");
    check("등급 라벨에 '극단'이라는 표현이 없음", !Object.values(TIER_LABEL).some((l) => l.includes("극단")));
  }

  // 분포 막대 — 5행, 순서 고정, 개수는 표면 계수와 일치
  for (const c of CASES) {
    const cnt = countElements(buildChart(c.iso, c.gender, c.hasHour));
    const bars = buildElementBars(cnt);
    eq(`[${c.name}] 막대 5행`, bars.length, 5);
    eq(`[${c.name}] 막대 순서 = 상생 순서`, bars.map((b) => b.element), CIRCLE_ORDER);
    check(`[${c.name}] 막대 개수가 표면 계수와 일치`, bars.every((b) => b.count === cnt.surface[b.element]));
    check(`[${c.name}] ratio는 0~1`, bars.every((b) => b.ratio >= 0 && b.ratio <= 1));
    check(`[${c.name}] 등급 라벨 비어있지 않음`, bars.every((b) => b.tierLabel.length > 0));
  }

  // 불균형 진단표 — 빈 등급은 행을 만들지 않고, 모든 오행이 정확히 한 행에만 속한다
  for (const c of CASES) {
    const cnt = countElements(buildChart(c.iso, c.gender, c.hasHour));
    const rows = buildImbalanceRows(cnt);
    check(`[${c.name}] 빈 행 없음`, rows.every((r) => r.elements.length > 0));
    const all = rows.flatMap((r) => r.elements);
    eq(`[${c.name}] 5개 오행이 빠짐없이 분류됨`, all.length, 5);
    eq(`[${c.name}] 중복 분류 없음`, new Set(all).size, 5);
    check(`[${c.name}] elementsKr 길이 일치`, rows.every((r) => r.elements.length === r.elementsKr.length));
  }

  // 용신 카드
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const card = buildYongsinCard(chart, cls);

    eq(`[${c.name}] 프레임은 classify와 동일`, card.frame, cls.frame);
    check(`[${c.name}] 억부·조후 양쪽 트랙이 카드에 실림`, card.eokbu === chart.yongsin.eokbu_candidates && card.johu === chart.yongsin.johu_candidates);
    check(`[${c.name}] 주 처방이 피해야 할 목록에 없음(자기모순 방지)`, card.main === null || !card.avoid.includes(card.main));
    eq(`[${c.name}] avoidKr 길이 일치`, card.avoid.length, card.avoidKr.length);
    check(`[${c.name}] 단정 금지 고지 항상 포함`, card.disclaimer.includes("단정하지 않고"));
    // §2 충돌 안내(승인 완료) — conflict일 때만 non-null, 그 외엔 항상 null
    eq(`[${c.name}] conflictNote는 trackRelation과 정확히 연동`, card.conflictNote !== null, card.trackRelation === "conflict");
    if (card.conflictNote) {
      check(`[${c.name}] conflictNote는 승인 문구 그대로`, card.conflictNote.includes("몸을 보강하는 관점(억부)과 계절의 온도를 맞추는 관점(조후)"));
    }

    // 채우기 프레임이면 희신은 "주 처방을 생하는 오행"
    if (card.frame === "fill" && card.main && card.helper) {
      eq(`[${c.name}] 희신이 주 처방을 생함`, C.GENERATES[card.helper], card.main);
    }
  }

  // 트랙 관계 판정 — 교집합/충돌/단일
  {
    const chartA = buildChart(CASES[0].iso, "M", true); // 억부 水木 ∩ 조후 水金 = 水
    const cardA = buildYongsinCard(chartA, classify(chartA));
    eq("[A] 교집합 있음 → intersect", cardA.trackRelation, "intersect");
    check("[A] 교집합에 水 포함", cardA.intersection.includes("水"));

    const chartC = buildChart(CASES[2].iso, "F", true); // 억부 木火 vs 조후 水金 — 정반대
    const cardC = buildYongsinCard(chartC, classify(chartC));
    eq("[C] 교집합 없음 → conflict", cardC.trackRelation, "conflict");
    eq("[C] 교집합 빈 배열", cardC.intersection, []);

    // 결정 ① 도출 규칙: 교집합 > 조후 > 억부
    eq("[A] 교집합 있으면 종합 = 교집합", cardA.yongsinByTrack, cardA.intersection);
    eq("[C] 충돌이면 종합 = 조후", cardC.yongsinByTrack, cardC.johu);

    // A케이스는 표면 부족(木)과 억부·조후 종합(水)이 갈리는 대표 사례 — 감추지 않고 플래그
    eq("[A] 표면 부족은 木", cardA.main, "木");
    check("[A] 억부·조후 종합에 木이 없음", !cardA.yongsinByTrack.includes("木"));
    eq("[A] 두 판정 갈림 플래그 true", cardA.divergesFromPrimary, true);
  }

  // 갈림 플래그의 정의가 일관적인지 — main이 종합에 들어있으면 false여야 한다
  {
    let checked = 0;
    for (let y = 1980; y <= 1990; y++) {
      for (let m = 1; m <= 12; m++) {
        const chart = buildChart(`${y}-${String(m).padStart(2, "0")}-11T09:00:00`, "M", true);
        const cls = classify(chart);
        const card = buildYongsinCard(chart, cls);
        if (card.main === null || card.yongsinByTrack.length === 0) continue;
        checked++;
        eq(
          `갈림 플래그 정의 일관 (${y}-${m})`,
          card.divergesFromPrimary,
          !card.yongsinByTrack.includes(card.main)
        );
      }
    }
    check("갈림 플래그 검사 표본 확보", checked > 50, `${checked}건`);
  }

  // 극단형 — 프레임이 뒤집히고, 희신은 설기 통로, 기신은 classify.exclude
  {
    let found: { chart: ReturnType<typeof buildChart>; cls: ReturnType<typeof classify> } | null = null;
    outer3: for (let y = 1970; y <= 2005 && !found; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          const cls = classify(chart);
          if (cls.pattern === "extreme") { found = { chart, cls }; break outer3; }
        }
      }
    }
    check("극단형 표본 존재", !!found);
    if (found) {
      const card = buildYongsinCard(found.chart, found.cls);
      eq("극단형 → 순응 프레임", card.frame, "follow");
      eq("극단형 주 처방 = dominant", card.main, found.cls.dominant);
      eq("극단형 희신 = dominant가 생하는 오행(설기 통로)", card.helper, C.GENERATES[found.cls.dominant!]);
      check("극단형 기신에 classify.exclude가 반영됨", found.cls.exclude.every((el) => card.avoid.includes(el)));
    }
  }

  // 섹션 조립
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const data = buildWuxingMap(chart, classify(chart));
    check(`[${c.name}] 도입 서술에 고정 도입문 포함`, data.intro.includes("그 판정부터 시작합니다"));
    eq(`[${c.name}] hourUnknown이 classify와 일치`, data.hourUnknown, classify(chart).hourUnknown);
    eq(`[${c.name}] 막대 5행`, data.bars.length, 5);
    check(`[${c.name}] 진단표 행 존재`, data.imbalance.length > 0);
  }

  // §1-2 연결문 4갈래 — 조건별로 정확한 연결문이 선택되는지 (docs/wuxing_pending_copy_v1.md §1)
  {
    const CONNECTOR_PHRASE = {
      match: "두 관점 모두에서 일치하는 결과입니다",
      mismatch: "이 차이를 함께 안내합니다",
      extreme: "흐름을 따르는 편이 명리학적으로 더 유효합니다",
      balanced: "흐름을 관리하는 처방입니다",
    } as const;

    for (const c of CASES) {
      const chart = buildChart(c.iso, c.gender, c.hasHour);
      const cls = classify(chart);
      const map = buildWuxingMap(chart, cls);
      const yongsin = buildYongsinCard(chart, cls);

      const expected: keyof typeof CONNECTOR_PHRASE =
        cls.pattern === "extreme" ? "extreme" : cls.primary === null ? "balanced" : yongsin.divergesFromPrimary ? "mismatch" : "match";

      check(`[${c.name}] 연결문 = ${expected}`, map.intro.includes(CONNECTOR_PHRASE[expected]), map.intro);
      // 나머지 3갈래 문구는 섞여 들어가면 안 된다(배타성 확인)
      for (const [key, phrase] of Object.entries(CONNECTOR_PHRASE)) {
        if (key === expected) continue;
        check(`[${c.name}] 다른 연결문(${key}) 안 섞임`, !map.intro.includes(phrase));
      }
    }

    // 극단형 표본으로 extreme 연결문도 직접 확인 (CASES 3개에 극단형이 없을 수 있어 별도 확보)
    let extremeChart: ReturnType<typeof buildChart> | null = null;
    outer5: for (let y = 1970; y <= 2005; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          if (classify(chart).pattern === "extreme") { extremeChart = chart; break outer5; }
        }
      }
    }
    check("극단형 표본 확보(§1 연결문 검증용)", !!extremeChart);
    if (extremeChart) {
      const map = buildWuxingMap(extremeChart, classify(extremeChart));
      check("극단형 연결문 정확", map.intro.includes(CONNECTOR_PHRASE.extreme));
    }
  }
}

// ── §③④⑤⑦ 리포트 조립 (report.ts) — 통합 규칙: §③ 기준은 primary 유지 ──
{
  // §③ 채우는 법 — target은 항상 primary(채우기) 또는 dominant(순응), classify.frame과 일치
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const fill = buildFillSection(chart, cls);

    eq(`[${c.name}] fill.frame = cls.frame`, fill.frame, cls.frame);
    const expectedTarget = cls.frame === "follow" ? cls.dominant : cls.primary;
    eq(`[${c.name}] fill.target = ${cls.frame === "follow" ? "dominant" : "primary"}(통합 규칙)`, fill.target, expectedTarget);

    if (fill.target && fill.frame === "fill") {
      check(`[${c.name}] 축 3~4개`, fill.axes.length >= 3 && fill.axes.length <= 4, `${fill.axes.length}개`);
      check(`[${c.name}] 축 중복 없음`, new Set(fill.axes.map((a) => a.axis)).size === fill.axes.length);
      check(`[${c.name}] 각 축 상위 3항목`, fill.axes.every((a) => a.items.length <= 3));
      check(`[${c.name}] A층 항목 총 ${fill.axes.length * 3}개 이하`, countFillItems(fill) <= fill.axes.length * 3, `${countFillItems(fill)}개`);
      check(`[${c.name}] intro 문장 존재`, !!fill.intro && fill.intro.length > 0);
      check(`[${c.name}] relationBlock에 writerNote 없음`, !("writerNote" in (fill.relationBlock ?? {})));
      check(`[${c.name}] supportElement가 target을 생함`, fill.supportElement === null || C.GENERATES[fill.supportElement] === fill.target);
      eq(`[${c.name}] peopleAxisPrimary는 relation과 일치`, fill.peopleAxisPrimary, fill.relation ? peopleAxisIsPrimary(fill.relation) : false);
      check(`[${c.name}] fill 프레임엔 extremeDirection 없음`, fill.extremeDirection === null);
      eq(`[${c.name}] fill 프레임엔 drainItems 없음`, fill.drainItems.length, 0);
      check(`[${c.name}] divergenceNote 존재(fill은 항상 §4 안내)`, !!fill.divergenceNote);
    } else if (fill.target && fill.frame === "follow") {
      eq(`[${c.name}] follow 프레임엔 축 없음(§3이 대체)`, fill.axes.length, 0);
      eq(`[${c.name}] follow 프레임엔 relationBlock 없음`, fill.relationBlock, null);
      eq(`[${c.name}] follow 프레임엔 divergenceNote 없음`, fill.divergenceNote, null);
      check(`[${c.name}] extremeDirection 존재`, !!fill.extremeDirection);
      eq(`[${c.name}] drainItems = A층 사전 §7 그대로`, fill.drainItems, elementDict(fill.target).drain.items);
    } else {
      eq(`[${c.name}] target 없으면 축도 없음`, fill.axes.length, 0);
    }

    // 순응 프레임에서는 exclude가 classify.exclude와 정확히 일치해야 한다
    if (cls.frame === "follow") {
      eq(`[${c.name}] fill.excluded = cls.exclude`, fill.excluded, cls.exclude);
    } else {
      eq(`[${c.name}] 채우기 프레임에서는 excluded 없음`, fill.excluded, []);
    }
  }

  // A케이스(재성 부족 + 신강이므로 조정 불필요) vs C케이스(재성 아닌 부족)로 §9 연동 확인
  {
    const chartA = buildChart(CASES[0].iso, "M", true);
    const fillA = buildFillSection(chartA, classify(chartA));
    eq("[A] relation = 재성(木, 庚 일간)", fillA.relation, "재성");
    check("[A] 신강이므로 조정 불필요", !fillA.strengthAdjustment.needed);

    // 재성 부족 + 신약 표본을 찾아 조정이 실제로 걸리는지 확인
    let weakJaeseong: ReturnType<typeof buildChart> | null = null;
    outer4: for (let y = 1970; y <= 2005; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          const cls = classify(chart);
          if (cls.frame === "fill" && cls.primary && computeRelation(chart.day_master_element, cls.primary) === "재성" && !chart.strength.is_strong) {
            weakJaeseong = chart;
            break outer4;
          }
        }
      }
    }
    check("재성 부족 + 신약 표본 존재", !!weakJaeseong);
    if (weakJaeseong) {
      const fillW = buildFillSection(weakJaeseong, classify(weakJaeseong));
      check("재성 부족 + 신약 → 조정 필요", fillW.strengthAdjustment.needed);
      check("조정 사유 문구 존재", !!fillW.strengthAdjustment.reason);
    }
  }

  // §3 극단형 처방 안내(승인 문구, docs/wuxing_pending_copy_v1.md §3) — 실제 내용 검증
  {
    let extremeChart: ReturnType<typeof buildChart> | null = null;
    outer6: for (let y = 1970; y <= 2005; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          if (classify(chart).pattern === "extreme") { extremeChart = chart; break outer6; }
        }
      }
    }
    check("§3 검증용 극단형 표본 확보", !!extremeChart);
    if (extremeChart) {
      const cls = classify(extremeChart);
      const fill = buildFillSection(extremeChart, cls);
      check("§3-1 도입문 포함", fill.intro?.includes("유난히 강하게 모인 구조입니다") ?? false);
      check("§3-1 반발 경고 포함", fill.intro?.includes("반발이 커질 수 있습니다") ?? false);
      // §3-2 — dominant 오행에 해당하는 방향 문구가 정확히 실렸는지(5종 중 1개)
      const expectedDirection: Record<string, string> = {
        木: "화(火) 방향으로 흘려보내는",
        火: "토(土) 방향으로 흘려보내는",
        土: "금(金) 방향으로 흘려보내는",
        金: "수(水) 방향으로 흘려보내는",
        水: "목(木) 방향으로 흘려보내는",
      };
      check("§3-2 방향 문구가 dominant와 일치", fill.extremeDirection?.includes(expectedDirection[cls.dominant!]) ?? false, fill.extremeDirection ?? "");
      check("§3 drainItems는 정확히 5개(A층 §7)", fill.drainItems.length === 5, `${fill.drainItems.length}개`);
    }

    // §4 — 실측 A케이스(mismatch 확정 사례)로 정확한 문구가 실리는지
    const chartA = buildChart(CASES[0].iso, "M", true);
    const fillA = buildFillSection(chartA, classify(chartA));
    check("[A] §4 불일치 문구 — '구조적으로 채워야 할 자리는'", fillA.divergenceNote?.includes("구조적으로 채워야 할 자리는") ?? false);
    check("[A] §4 불일치 문구 — 용신(用神) 표기 포함", fillA.divergenceNote?.includes("용신") ?? false);
    check("[A] §4 불일치 문구 — §② 용신 카드 참고 안내", fillA.divergenceNote?.includes("§② 용신 카드") ?? false);

    // §4-2 — primary와 종합 용신이 실제로 일치하는 표본을 찾아 "일치" 문구 확인
    let matchChart: ReturnType<typeof buildChart> | null = null;
    outer7: for (let y = 1970; y <= 2005; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [3, 11, 19, 27]) {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T09:00:00`;
          const chart = buildChart(iso, "M", true);
          const cls = classify(chart);
          if (cls.frame === "fill" && cls.primary && !buildYongsinCard(chart, cls).divergesFromPrimary) {
            matchChart = chart;
            break outer7;
          }
        }
      }
    }
    check("§4-2 검증용 일치 표본 확보", !!matchChart);
    if (matchChart) {
      const fillM = buildFillSection(matchChart, classify(matchChart));
      check("[일치 표본] §4-2 문구 — '으로 일치합니다'", fillM.divergenceNote?.includes("일치합니다") ?? false);
      check("[일치 표본] §4-2엔 '기준으로 구성되어 있으며' 없음(불일치 전용 문구)", !(fillM.divergenceNote?.includes("기준으로 구성되어 있으며") ?? false));
    }
  }

  // §④ 사람 축 — 5블록 전부, mustInclude 고지 항상 포함
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const people = buildPeopleSection(chart, classify(chart));
    check(`[${c.name}] intro·priorityNote 존재`, people.intro.length > 0 && people.priorityNote.length > 0);
    eq(`[${c.name}] 관찰 5행`, people.observation.rows.length, 5);
    check(`[${c.name}] 피해야 할 조건 mustInclude(절연 아님)`, people.avoid.mustInclude.includes("절연"));
    check(`[${c.name}] 관계 유형 4종`, people.byRelationType.length === 4);
    if (people.partner) {
      eq(`[${c.name}] partner.target = fill.target`, people.partner.target, buildFillSection(chart, classify(chart)).target);
    }
  }

  // §⑤ 넘치는 기운 — 과다 없으면 groups 비고, DrainSection이 null 반환(컴포넌트 레벨 확인은 별도)
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const drain = buildDrainSection(cls);
    eq(`[${c.name}] drain.groups 개수 = 과다 오행 개수`, drain.groups.length, cls.excessive.length);
    check(`[${c.name}] 각 group의 target은 해당 오행이 생하는 오행`, drain.groups.every((g) => C.GENERATES[g.element] === g.target));
    // companion은 수 부족 + 화 과다일 때만
    const waterDeficient = cls.absent.includes("水") || cls.scarce.includes("水");
    const fireExcessive = cls.excessive.includes("火");
    eq(`[${c.name}] companion 조건 일치`, drain.companion !== null, waterDeficient && fireExcessive);
  }

  // §⑦ 마무리 — 고정 데이터라 결정적
  {
    const closing = buildClosingSection();
    eq("강도 범례 3단계(A/B/C)", Object.keys(closing.strengthLegend).sort(), ["A", "B", "C"]);
    check("개운법 고지 존재", closing.disclaimer.length > 0);
  }

  // 전체 조립 — buildWuxingReport
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const report = buildWuxingReport(chart, cls, {}, 2026);
    eq(`[${c.name}] narratives 비어있으면 그대로 반영`, report.narratives, {});
    eq(`[${c.name}] 세운 3년`, report.seun.years.length, 3);
    // narratives를 채워서 넘기면 그대로 반영되는지
    const withNarrative = buildWuxingReport(chart, cls, { diagnosis: { sentence1: "a", sentence2: "b" }, seunFlow: "c" }, 2026);
    eq(`[${c.name}] narratives 채워 넘기면 반영`, withNarrative.narratives.diagnosis?.sentence1, "a");
  }

  // 결정성
  for (const c of CASES) {
    const chart = buildChart(c.iso, c.gender, c.hasHour);
    const cls = classify(chart);
    const r1 = buildWuxingReport(chart, cls, {}, 2026);
    const r2 = buildWuxingReport(chart, cls, {}, 2026);
    eq(`[${c.name}] 리포트 조립 결정적`, JSON.stringify(r1), JSON.stringify(r2));
  }
}

// ── 결과 ───────────────────────────────────────────────────────────
console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
