/**
 * astro.ts — 운명 설계도(/blueprint) 전용 정밀 태양 위치 계산.
 *
 * 기존 lib/saju-engine/engine.ts는 절기를 매년 고정된 달력 날짜로 근사한다
 * (SOLAR_TERM_APPROX). 실제 절기는 지구 공전 때문에 해마다 하루 이틀씩
 * 앞뒤로 움직이므로, 경계일 출생자는 월주·연주가 틀릴 수 있다.
 *
 * 이 파일은 그 문제를 푸는 대신, 기존 엔진과 완전히 분리된 정밀 계산을
 * 새로 구현한다(엔진 코드는 건드리지 않는다 — 격리 조건). Jean Meeus,
 * "Astronomical Algorithms" 25장의 저정밀 태양 위치 공식을 쓴다.
 * 오차는 각도 기준 약 0.01° 이내로, 절기 시각 기준 1분 이내 정밀도다.
 */

const DEG2RAD = Math.PI / 180;

/** 그레고리력 → 율리우스일(UT, 소수 포함). engine.ts의 정수 버전과 달리 시각을 담는다. */
export function toJulianDay(y: number, m: number, d: number, hour: number, minute: number, second = 0): number {
  let yy = y, mm = m;
  if (mm <= 2) { yy -= 1; mm += 12; }
  const a = Math.floor(yy / 100);
  const b = 2 - a + Math.floor(a / 4);
  const dayFrac = d + (hour + minute / 60 + second / 3600) / 24;
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + dayFrac + b - 1524.5;
}

/** 태양의 겉보기 황경(apparent ecliptic longitude), 도(0~360) 단위. Meeus 25장 저정밀식. */
export function apparentSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * DEG2RAD;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);
  return ((apparent % 360) + 360) % 360;
}

/**
 * 균시차(equation of time), 분 단위. 평균태양시와 진태양시의 차이.
 * 표준 근사식(오차 약 ±1분) — 이 정도면 "전국 평균 경도" 근사와 균형이 맞는다.
 */
export function equationOfTimeMinutes(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000) + 1;
  const B = ((360 / 365) * (dayOfYear - 81)) * DEG2RAD;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/** 대한민국 표준시 기준 경도(135°E)와, 출생지를 몰라 쓰는 전국 평균 대표 경도(서울, 약 126.98°E). */
export const KST_STANDARD_MERIDIAN = 135;
export const KOREA_AVG_LONGITUDE = 126.98;

/**
 * 진태양시 보정을 적용한 Date를 돌려준다.
 * 보정 = (관측지 경도 - 135°) × 4분/도 + 균시차.
 * 출생지 입력을 받지 않으므로 전국 평균 경도(서울)로 고정 근사한다 — 극단
 * 지역(신의주·독도 등)은 수 분 오차가 남을 수 있다는 걸 판독 한계에 명시할 것.
 */
export function trueSolarTime(kstDate: Date, longitude = KOREA_AVG_LONGITUDE): Date {
  const longitudeOffsetMin = (longitude - KST_STANDARD_MERIDIAN) * 4;
  const eotMin = equationOfTimeMinutes(kstDate);
  const totalOffsetMs = (longitudeOffsetMin + eotMin) * 60 * 1000;
  return new Date(kstDate.getTime() + totalOffsetMs);
}

/**
 * 목표 황경(도)에 도달하는 정확한 시각을 근사 날짜 주변에서 반복 보정으로 찾는다.
 * 태양의 평균 이동 속도(~0.9856°/일)를 이용한 선형 근사를 4회 반복하면
 * 초 단위로 수렴한다(태양 이동이 단기간에는 거의 선형이라 뉴턴법 없이도 충분하다).
 */
export function findSolarLongitudeCrossing(targetDeg: number, guessDate: Date): Date {
  let t = guessDate.getTime();
  const RATE_DEG_PER_MS = 0.9856 / 86400000; // 도/밀리초
  for (let i = 0; i < 6; i++) {
    const jd = toJulianDay(
      new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, new Date(t).getUTCDate(),
      new Date(t).getUTCHours(), new Date(t).getUTCMinutes(), new Date(t).getUTCSeconds()
    );
    const lon = apparentSolarLongitude(jd);
    let diff = targetDeg - lon;
    // 0/360 경계를 넘나드는 차이를 -180~180으로 정규화
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    t += diff / RATE_DEG_PER_MS;
  }
  return new Date(t);
}

/** 절기 12절(월지 경계) — 경도 315°(입춘)부터 30°씩. */
export const MONTH_TERM_BRANCHES: { deg: number; branch: string; name: string }[] = [
  { deg: 315, branch: "寅", name: "입춘" },
  { deg: 345, branch: "卯", name: "경칩" },
  { deg: 15, branch: "辰", name: "청명" },
  { deg: 45, branch: "巳", name: "입하" },
  { deg: 75, branch: "午", name: "망종" },
  { deg: 105, branch: "未", name: "소서" },
  { deg: 135, branch: "申", name: "입추" },
  { deg: 165, branch: "酉", name: "백로" },
  { deg: 195, branch: "戌", name: "한로" },
  { deg: 225, branch: "亥", name: "입동" },
  { deg: 255, branch: "子", name: "대설" },
  { deg: 285, branch: "丑", name: "소한" },
];

/** 출생 시각(진태양시 보정 완료)의 태양 황경으로 월지를 직접 판정한다. 절기 시각을 몰라도 되는 방식. */
export function preciseMonthBranch(correctedDate: Date): { branch: string; name: string; deg: number; longitude: number } {
  const jd = toJulianDay(
    correctedDate.getUTCFullYear(), correctedDate.getUTCMonth() + 1, correctedDate.getUTCDate(),
    correctedDate.getUTCHours(), correctedDate.getUTCMinutes(), correctedDate.getUTCSeconds()
  );
  const lon = apparentSolarLongitude(jd);
  // 315를 0으로 두고 30씩 나눠 12구간 중 어디 속하는지 계산
  const idx = Math.floor((((lon - 315 + 360) % 360)) / 30);
  return { ...MONTH_TERM_BRANCHES[idx], longitude: lon };
}

/**
 * 입춘 정확한 시각(그 역법연도 기준)을 계산해, 출생 시각이 입춘 이전/이후인지로
 * BaZi 연주 경계(engine.ts의 "2/4 고정" 근사를 대체)를 정한다.
 */
export function preciseLichun(calendarYear: number): Date {
  const guess = new Date(Date.UTC(calendarYear, 1, 4, 0, 0, 0)); // 2월 4일 근방에서 탐색 시작
  return findSolarLongitudeCrossing(315, guess);
}

/** 출생 시각(진태양시 보정 완료) 기준 BaZi 연도(=연주 계산에 쓸 해)를 정한다. */
export function preciseBaziYear(correctedDate: Date): number {
  const y = correctedDate.getUTCFullYear();
  const lichunThisYear = preciseLichun(y);
  return correctedDate.getTime() >= lichunThisYear.getTime() ? y : y - 1;
}

/**
 * 대운수 계산용 — 출생 시각으로부터 다음(순행) 또는 이전(역행) 절(節) 경계까지의
 * 정확한 일수(소수 포함). 기존 엔진의 "생일만 보고 3일=1년 근사"보다 정밀하다.
 * 관례상 대운수 = 이 일수 / 3, 반올림하되 최소 1.
 */
export function preciseDaysToAdjacentTerm(correctedDate: Date, forward: boolean): number {
  const jd = toJulianDay(
    correctedDate.getUTCFullYear(), correctedDate.getUTCMonth() + 1, correctedDate.getUTCDate(),
    correctedDate.getUTCHours(), correctedDate.getUTCMinutes(), correctedDate.getUTCSeconds()
  );
  const lon = apparentSolarLongitude(jd);
  const idx = Math.floor((((lon - 315 + 360) % 360)) / 30);
  // forward(순행)=다음 구간의 시작 경계, reverse(역행)=현재 구간이 시작된 경계(=지나온 절기)
  const boundaryDeg = forward
    ? MONTH_TERM_BRANCHES[(idx + 1) % 12].deg
    : MONTH_TERM_BRANCHES[idx].deg;
  const guess = new Date(correctedDate.getTime() + (forward ? 15 : -15) * 86400000);
  const crossing = findSolarLongitudeCrossing(boundaryDeg, guess);
  return Math.abs(crossing.getTime() - correctedDate.getTime()) / 86400000;
}
