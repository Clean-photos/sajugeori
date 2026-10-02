/**
 * unified.test.ts — 통합 명식 엔진(lib/saju-engine/index.ts buildChart → 정밀 엔진) 검증.
 * 실행: npx tsx lib/saju-engine/unified.test.ts
 *
 * CoS 8·9차 A: 모든 상품이 같은 사주에서 같은 명식을 내야 하고, 서머타임·옛 표준시·
 * 자시·시각 모름이 서버 타임존과 무관하게 일관되게 처리돼야 한다.
 */
import { buildChart, runSajuEngine } from "./index";
import { seoulOffsetMs, parseSeoulWallClock } from "../blueprint-engine/astro";

let passed = 0;
const failures: string[] = [];
function eq<T>(label: string, actual: T, expected: T) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) passed++;
  else failures.push(`${label} — 기대 ${b} / 실제 ${a}`);
}
const pillars = (iso: string, g: "M" | "F", hour = true) => {
  const c = buildChart(iso, g, hour);
  return ["year", "month", "day", "hour"]
    .map((k) => { const p = (c.pillars as Record<string, { stem: string; branch: string } | null>)[k]; return p ? p.stem + p.branch : "--"; })
    .join(" ");
};

// 같은 사주 → 어느 진입점으로 불러도 동일(1989-03-21 19:20 여: 설계도 乙酉 / 궁합 丙戌이던 사고)
eq("1989 명식", pillars("1989-03-21T19:20:00", "F"), "己巳 丁卯 庚辰 乙酉");
{
  const viaRun = runSajuEngine({ birth_date: "1989-03-21", birth_time: "19:20", calendar: "solar", gender: "F" });
  const p = viaRun.saju_json.pillars as unknown as Record<string, { stem: string; branch: string }>;
  eq("runSajuEngine도 동일", `${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}`, "己巳 丁卯 庚辰 乙酉");
}
eq("궁합 상대(1991-08-14 07:45 남)", pillars("1991-08-14T07:45:00", "M"), "辛未 丙申 丙辰 壬辰");

// 법정 시각: 표준·서머타임·옛 표준시(IANA Asia/Seoul)
const off = (iso: string) => seoulOffsetMs(parseSeoulWallClock(iso).getTime()) / 60000;
eq("현행 +9:00", off("2000-01-01T12:00:00"), 540);
eq("1987 서머타임 +10:00", off("1987-06-01T12:00:00"), 600);
eq("1987 겨울은 표준", off("1987-12-01T12:00:00"), 540);
eq("1988 서머타임", off("1988-07-01T12:00:00"), 600);
eq("1948 서머타임", off("1948-07-01T12:00:00"), 600);
eq("1954-03-21 이전 +9:00", off("1954-01-01T12:00:00"), 540);
eq("1954~61 옛 표준시 +8:30", off("1954-04-01T12:00:00"), 510);
eq("1955 서머타임 +9:30", off("1955-07-01T12:00:00"), 570);
eq("1961-08-10 이후 +9:00", off("1961-09-01T12:00:00"), 540);

// 서머타임 보정이 실제로 명식에 반영되는가 — 1987-06-01 12:00은 서머타임(+10)이라
// 진태양시 10:30(시계 12:00이 아님). 시주가 巳시(9~11)로 나와야 한다(보정 없으면 午시).
{
  const c = buildChart("1987-06-01T12:00:00", "F", true);
  eq("1987 서머타임 진태양시", c.solar_clock, "10:30");
  eq("1987 서머타임 시지", c.pillars.hour?.branch, "巳");
  eq("법정 오프셋 기록", c.legal_offset_minutes, 600);
}

// 자시: 진태양시 23:00~은 다음 날 일주, 시주는 그 날 일간의 子시
{
  const c = buildChart("1989-03-21T23:40:00", "F", true);
  eq("자시 롤오버 플래그", c.day_rolled_by_jasi, true);
  eq("자시 일주=다음 날", `${c.pillars.day.stem}${c.pillars.day.branch}`, "辛巳");
  eq("자시 시주", `${c.pillars.hour?.stem}${c.pillars.hour?.branch}`, "戊子");
}
{
  const c = buildChart("1989-03-21T19:20:00", "F", true);
  eq("저녁 출생은 롤오버 없음", c.day_rolled_by_jasi, false);
}

// 시각 모름: 자정(00:00)을 그대로 쓰면 진태양시 보정으로 전날 일주가 되던 문제
eq("시각 모름 일주=입력 날짜 그대로", pillars("1989-03-21T00:00:00", "F", false), "己巳 丁卯 庚辰 --");
eq("시각 모름 서머타임 기간도 동일", pillars("1987-06-01T00:00:00", "F", false), "丁卯 乙巳 辛巳 --");

console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
console.log("전부 통과");
