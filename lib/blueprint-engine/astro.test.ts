/**
 * astro.ts 검증 — 실행: npx tsx lib/blueprint-engine/astro.test.ts
 * 알려진 천문 기준점(춘분·하지·추분·동지)과 절기 근사 날짜로 정밀도를 확인한다.
 */
import { apparentSolarLongitude, toJulianDay, findSolarLongitudeCrossing, preciseMonthBranch, preciseLichun, trueSolarTime } from "./astro";

function check(label: string, actual: number, expected: number, tolerance: number) {
  let diff = Math.abs(actual - expected);
  if (diff > 180) diff = 360 - diff; // 0°/360° 경계 랩어라운드 보정
  const ok = diff <= tolerance;
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}: ${actual.toFixed(3)} (기대 ${expected}±${tolerance}, 오차 ${diff.toFixed(3)})`);
}

// 2026년 춘분(약 3/20 12:00 KST=UTC+9 → 3/20 03:00 UTC 근방) 황경은 0°에 가까워야 함
const springEquinoxJd = toJulianDay(2026, 3, 20, 3, 0, 0);
check("2026 춘분 근방 황경(≈0°)", apparentSolarLongitude(springEquinoxJd), 0, 1.5);

// 하지(6/21 근방)는 90°
const summerJd = toJulianDay(2026, 6, 21, 3, 0, 0);
check("2026 하지 근방 황경(≈90°)", apparentSolarLongitude(summerJd), 90, 1.5);

// 동지(12/22 근방)는 270°
const winterJd = toJulianDay(2026, 12, 22, 3, 0, 0);
check("2026 동지 근방 황경(≈270°)", apparentSolarLongitude(winterJd), 270, 1.5);

// 입춘 — 매년 2/3~2/5 사이여야 함(고정 2/4가 아니라 해마다 다름을 확인)
for (const y of [2024, 2025, 2026, 2027]) {
  const lichun = preciseLichun(y);
  const kst = new Date(lichun.getTime() + 9 * 3600 * 1000);
  console.log(`${y}년 입춘(KST): ${kst.toISOString().slice(0, 16).replace("T", " ")}`);
}

// 월지 버킷 판정 — 확실히 봄 한복판(4월 중순)인 날짜는 辰월(청명~입하 사이)이어야 함
const aprilKst = new Date(Date.UTC(2026, 3, 15, 3, 0, 0)); // KST 4/15 12:00 == UTC 4/15 03:00
console.log("2026-04-15 KST 12:00 월지 판정:", preciseMonthBranch(aprilKst));

// 진태양시 보정 — 서울 기준이면 항상 표준시보다 늦어야 한다(음수 보정)
const noon = new Date(Date.UTC(2026, 5, 21, 3, 0, 0));
const corrected = trueSolarTime(noon);
console.log(
  `진태양시 보정(하지, 서울): 원 시각 대비 ${((corrected.getTime() - noon.getTime()) / 60000).toFixed(1)}분`
);
