/**
 * report-target.test.ts — 대상 사주 확정 레이어의 순수 함수 검증.
 * 실행: npx tsx lib/billing/report-target.test.ts
 *
 * DB를 타는 함수(resolveTarget/readAdhocCache 등)는 여기서 다루지 않는다.
 * 여기서 막으려는 건 **조용히 틀리는** 것들이다 — ISO 문자열이 깨져 간지가
 * undefined가 되거나, 시각 표기 차이("14:30" vs "14:30:00")로 본인 사주를
 * 남의 사주로 오판해 1회성 캐시가 갈리는 종류.
 */
import { parseTargetBody, isoOf, timeKeyOf, sameAsProfile, type TargetInput, type OwnProfile } from "./report-target-core";

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

// ── parseTargetBody ────────────────────────────────────────────────
{
  const ok = parseTargetBody({ birth_date: "1990-05-15", birth_time: "14:30", gender: "M" });
  check("정상 입력 통과", ok.ok);
  if (ok.ok) {
    eq("생년월일 보존", ok.input.birthDate, "1990-05-15");
    eq("시각 보존", ok.input.birthTime, "14:30");
    eq("calendar 기본값 solar", ok.input.calendar, "solar");
  }

  check("시각 없음 허용", parseTargetBody({ birth_date: "1990-05-15", gender: "F" }).ok);
  check("빈 문자열 시각 = 시각 모름", (() => {
    const r = parseTargetBody({ birth_date: "1990-05-15", birth_time: "", gender: "F" });
    return r.ok && r.input.birthTime === null;
  })());
  check("HH:MM:SS 형식 허용", parseTargetBody({ birth_date: "1990-05-15", birth_time: "14:30:00", gender: "M" }).ok);

  check("생년월일 형식 오류 거부", !parseTargetBody({ birth_date: "1990-5-15", gender: "M" }).ok);
  check("생년월일 누락 거부", !parseTargetBody({ gender: "M" }).ok);
  check("성별 누락 거부", !parseTargetBody({ birth_date: "1990-05-15" }).ok);
  check("성별 오값 거부", !parseTargetBody({ birth_date: "1990-05-15", gender: "X" }).ok);
  check("빈 body 거부", !parseTargetBody({}).ok);
  check("null body 거부", !parseTargetBody(null).ok);
  // 형식이 깨진 시각이 통과하면 buildChart가 조용히 Invalid Date를 만든다
  check("깨진 시각 형식 거부(1430)", !parseTargetBody({ birth_date: "1990-05-15", birth_time: "1430", gender: "M" }).ok);
  check("깨진 시각 형식 거부(14:30:00:00)", !parseTargetBody({ birth_date: "1990-05-15", birth_time: "14:30:00:00", gender: "M" }).ok);
}

// ── isoOf — 2026-09-02 실제 사고(초 중복 부착) 재발 방지 ─────────────
{
  const t = (birthTime: string | null): TargetInput =>
    ({ birthDate: "1988-05-14", birthTime, gender: "M", calendar: "solar" });

  eq("HH:MM → 초 1회만 붙음", isoOf(t("14:30")), "1988-05-14T14:30:00");
  eq("HH:MM:SS → 그대로", isoOf(t("14:30:00")), "1988-05-14T14:30:00");
  eq("시각 모름 → 자정", isoOf(t(null)), "1988-05-14T00:00:00");

  // 어떤 입력이든 new Date()가 반드시 유효해야 한다. 여기가 깨지면 간지 계산이
  // 예외 없이 전부 NaN/undefined로 무너진다(실제로 그렇게 터졌다).
  for (const time of ["14:30", "14:30:00", "00:00", "23:59", null]) {
    check(`ISO 파싱 가능: ${time ?? "시각모름"}`, !isNaN(new Date(isoOf(t(time))).getTime()));
  }
  check("깨진 ISO는 Invalid Date(대조군)", isNaN(new Date("1988-05-14T14:30:00:00").getTime()));
}

// ── timeKeyOf / sameAsProfile ──────────────────────────────────────
{
  eq("timeKey: HH:MM:SS → HH:MM", timeKeyOf("14:30:00"), "14:30");
  eq("timeKey: HH:MM 유지", timeKeyOf("14:30"), "14:30");
  eq("timeKey: null → 빈 문자열", timeKeyOf(null), "");

  const profile: OwnProfile = {
    id: "p1", birth_date: "1990-05-15", birth_time: "14:30:00", gender: "M", calendar: "solar",
  };
  const mk = (o: Partial<TargetInput>): TargetInput =>
    ({ birthDate: "1990-05-15", birthTime: "14:30", gender: "M", calendar: "solar", ...o });

  // DB는 "14:30:00", 폼은 "14:30"으로 보낸다. 정규화가 없으면 본인 사주를
  // 매번 남의 사주로 오판해 1회성 캐시가 계속 새로 쌓인다.
  check("본인 판정: HH:MM vs HH:MM:SS 동일 취급", sameAsProfile(mk({}), profile));
  check("본인 판정: 생년월일 다르면 타인", !sameAsProfile(mk({ birthDate: "1991-05-15" }), profile));
  check("본인 판정: 성별 다르면 타인", !sameAsProfile(mk({ gender: "F" }), profile));
  check("본인 판정: 시각 다르면 타인", !sameAsProfile(mk({ birthTime: "09:00" }), profile));
  check("본인 판정: 시각 모름 vs 등록 시각 있음 → 타인", !sameAsProfile(mk({ birthTime: null }), profile));

  const noTimeProfile: OwnProfile = { ...profile, birth_time: null };
  check("본인 판정: 양쪽 다 시각 모름 → 본인", sameAsProfile(mk({ birthTime: null }), noTimeProfile));
  check("본인 판정: 등록만 시각 모름 → 타인", !sameAsProfile(mk({ birthTime: "14:30" }), noTimeProfile));
}

console.log(`\n통과 ${passed}건 / 실패 ${failures.length}건`);
if (failures.length > 0) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("전부 통과");
