/**
 * 한국 시각 기준 "지금" 헬퍼(2026-10-04 점검).
 * 서버(Vercel)는 UTC라 new Date().getFullYear()가 한국 기준 1월 1일 0~9시에 작년을 돌려줬다
 * ("올해 운세"·나이·삼재 판정이 새해 첫 9시간 동안 한 해 어긋남). 연·월은 이 헬퍼를 쓴다.
 */
const KST_OFFSET_MS = 9 * 3600000;

export function kstNow(now: number = Date.now()): Date {
  return new Date(now + KST_OFFSET_MS);
}
/** 한국 기준 현재 연도 */
export function kstYear(now?: number): number {
  return kstNow(now).getUTCFullYear();
}
/** 한국 기준 현재 월(1~12) */
export function kstMonth(now?: number): number {
  return kstNow(now).getUTCMonth() + 1;
}

/** 로컬 달력 날짜를 "YYYY-MM-DD"로. toISOString()은 UTC로 바꿔 한국에선 하루 전 날짜가 나온다(자정 기준 Date). */
export function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 한국 기준 오늘 날짜 "YYYY-MM-DD" — 브라우저·서버 시간대와 무관하다(UTC 브라우저에서 하루 전 날짜가 뜨던 문제, CoS 10차 §11). */
export function kstDateStr(now?: number): string {
  return kstNow(now).toISOString().slice(0, 10);
}

/** 한국 기준 (이번 달 + plusMonths)의 말일 "YYYY-MM-DD" */
export function kstMonthEndStr(plusMonths: number, now?: number): string {
  const k = kstNow(now);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + plusMonths + 1, 0)).toISOString().slice(0, 10);
}
