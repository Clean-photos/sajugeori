/**
 * blueprint-engine/engine.ts 검증 — 실행: npx tsx lib/blueprint-engine/engine.test.ts
 *
 * 1) 절기 경계에서 먼 날짜는 기존 근사 엔진과 정밀 엔진의 연·월주가 일치해야 한다
 *    (계산 방식이 근본적으로 다르지 않다는 걸 확인 — 로직 오류가 있으면 여기서 어긋난다).
 * 2) 절기 경계 근처 날짜는 기존 근사 엔진과 달라질 수 있다는 걸 보여준다
 *    (이게 이 모듈을 만든 이유 그 자체).
 */
import { buildChart, stemBranchKr } from "@/lib/saju-engine/engine";
import { buildPreciseChart } from "./engine";

function compare(label: string, birthIso: string, gender: string) {
  const legacy = buildChart(birthIso, gender, true);
  const precise = buildPreciseChart(birthIso, gender, true);
  const legacyStr = `${stemBranchKr(legacy.pillars.year.stem, legacy.pillars.year.branch)} ${stemBranchKr(legacy.pillars.month.stem, legacy.pillars.month.branch)} ${stemBranchKr(legacy.pillars.day.stem, legacy.pillars.day.branch)}`;
  const preciseStr = `${stemBranchKr(precise.pillars.year.stem, precise.pillars.year.branch)} ${stemBranchKr(precise.pillars.month.stem, precise.pillars.month.branch)} ${stemBranchKr(precise.pillars.day.stem, precise.pillars.day.branch)}`;
  const match = legacyStr === preciseStr;
  console.log(`\n[${label}] ${birthIso} (${gender})`);
  console.log(`  근사: ${legacyStr}`);
  console.log(`  정밀: ${preciseStr}  ${match ? "(일치)" : "(차이남)"}`);
  console.log(`  정밀 대운수: ${precise.precise_daewoon.start_age}세 (기존 근사: ${legacy.daewoon.start_age}세), 방향 ${precise.precise_daewoon.direction}`);
}

// 1) 절기에서 먼 날짜(음력 5월경, 절기 경계와 거리가 멀다) — 일치해야 정상
compare("기준 명식(경계와 무관)", "1989-03-21T19:30:00", "M");
compare("여름 한복판", "2000-07-15T10:00:00", "F");

// 2) 입춘 경계 근처 — 기존 엔진은 매년 2/4 고정, 실제 입춘은 해마다 다르다.
// 2025년 입춘은 실제로 2/3(우리 계산 기준)이므로, 2/3~2/4 사이 출생자는
// 기존 근사 엔진과 연주가 갈릴 수 있다.
compare("2025년 입춘 경계 근처 (2/3 20:00)", "2025-02-03T20:00:00", "F");
compare("2025년 입춘 경계 근처 (2/4 10:00)", "2025-02-04T10:00:00", "F");

// 3) 성별에 따른 대운 순행/역행 확인
compare("남성 대운 방향 확인", "1990-05-05T12:00:00", "M");
compare("여성 대운 방향 확인", "1990-05-05T12:00:00", "F");
