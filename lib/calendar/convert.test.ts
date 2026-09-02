/**
 * convert.test.ts — 음력↔양력 변환 레이어 검증.
 * 실행: npx tsx lib/calendar/convert.test.ts
 *
 * 사주는 하루만 어긋나도 간지가 통째로 달라진다. 그래서 여기서 막으려는 건
 * "조용히 하루 틀린 값이 통과하는 것"이다 — 실패해야 할 입력이 성공하거나,
 * 왕복 변환이 제자리로 돌아오지 않는 경우.
 */
import { toSolar, solarToLunar, calendarLabel } from "./convert";

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

// ── 양력 입력 ──────────────────────────────────────────────────────
{
  const r = toSolar("1953-05-20", "solar");
  check("양력 통과", r.ok);
  if (r.ok) {
    eq("양력은 그대로 유지", r.solar, "1953-05-20");
    eq("대응 음력 병기", r.lunar, "1953-04-08");
    eq("윤달 아님", r.isLeap, false);
  }

  // Date가 조용히 다음 달로 넘겨 버리는 값들 — 반드시 실패해야 한다
  check("2월 30일 거부", !toSolar("1990-02-30", "solar").ok);
  check("13월 거부", !toSolar("1990-13-01", "solar").ok);
  check("4월 31일 거부", !toSolar("1990-04-31", "solar").ok);
  check("평년 2월 29일 거부", !toSolar("1991-02-29", "solar").ok);
  check("윤년 2월 29일 허용", toSolar("1992-02-29", "solar").ok);
  check("형식 오류 거부", !toSolar("1990-5-15", "solar").ok);
  check("빈 값 거부", !toSolar("", "solar").ok);
}

// ── 음력 입력 ──────────────────────────────────────────────────────
{
  const r = toSolar("1953-04-08", "lunar");
  check("음력(평달) 통과", r.ok);
  if (r.ok) {
    eq("음력 → 양력 변환", r.solar, "1953-05-20");
    eq("입력한 음력 보존", r.lunar, "1953-04-08");
  }

  // 그 해에 없는 윤달을 윤달로 지정하면 실패해야 한다.
  // (조용히 평달로 처리하면 사용자는 틀린 사주를 정확한 것으로 받는다)
  check("없는 윤달 거부", !toSolar("1953-04-08", "lunar-leap").ok);
  check("존재하지 않는 음력 날짜 거부", !toSolar("1953-04-31", "lunar").ok);
}

// ── 왕복 검증 — 하루 밀림이 없어야 한다 ─────────────────────────────
{
  const samples = [
    "1953-05-20", "1970-01-01", "1988-02-17", "1990-05-15",
    "2000-12-31", "2010-06-15", "1992-02-29", "2024-09-02",
  ];
  for (const s of samples) {
    const l = solarToLunar(s);
    check(`음력 산출: ${s}`, !!l);
    if (!l) continue;
    const back = toSolar(l.lunar, l.isLeap ? "lunar-leap" : "lunar");
    check(`왕복 일치: ${s}`, back.ok && back.solar === s);
  }
}

// ── 표기 ───────────────────────────────────────────────────────────
{
  eq("라벨 양력", calendarLabel("solar"), "양력");
  eq("라벨 음력 평달", calendarLabel("lunar"), "음력(평달)");
  eq("라벨 음력 윤달", calendarLabel("lunar-leap"), "음력(윤달)");
}

console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
