// 캐릭터 프로필 시즌 판정 — KST 기준
//
// 기본 사계절(절기 근사, saju-engine constants와 동일 경계):
//   봄 = 입춘(2/4) ~ 입하 전날(5/5) / 여름 = 입하(5/6) ~ 입추 전날(8/7)
//   가을 = 입추(8/8) ~ 입동 전날(11/6) / 겨울 = 입동(11/7) ~ 입춘 전날(2/3)
// 오버레이(기본 시즌보다 우선):
//   새해 = 설연휴 시작 1주 전 ~ 연휴 마지막 날
//   추석 = 추석연휴 시작 1주 전 ~ 연휴 마지막 날
//   크리스마스 = 12/11 ~ 12/25
// 명절 테이블에 없는 연도는 기본 사계절로 폴백(크리스마스는 고정 날짜라 항상 동작).

export type Season =
  | "spring"
  | "summer"
  | "autumn"
  | "winter"
  | "seollal"
  | "chuseok"
  | "christmas";

// 법정 연휴 [시작, 끝] (대체공휴일 포함) — 2026~2030
const SEOLLAL_HOLIDAYS: Record<number, [string, string]> = {
  2026: ["2026-02-16", "2026-02-18"],
  2027: ["2027-02-06", "2027-02-09"],
  2028: ["2028-01-26", "2028-01-28"],
  2029: ["2029-02-12", "2029-02-14"],
  2030: ["2030-02-02", "2030-02-05"],
};
const CHUSEOK_HOLIDAYS: Record<number, [string, string]> = {
  2026: ["2026-09-24", "2026-09-26"],
  2027: ["2027-09-14", "2027-09-16"],
  2028: ["2028-10-02", "2028-10-05"],
  2029: ["2029-09-21", "2029-09-24"],
  2030: ["2030-09-11", "2030-09-13"],
};

function dayNum(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function parseDayNum(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return dayNum(y, m, d);
}

function inHolidayWindow(
  table: Record<number, [string, string]>,
  year: number,
  today: number,
  leadDays: number
): boolean {
  // 연휴가 연초라 전년도 12월에 윈도가 걸칠 수 있으니 해당 연도와 다음 연도 둘 다 확인
  for (const y of [year, year + 1]) {
    const range = table[y];
    if (!range) continue;
    const start = parseDayNum(range[0]) - leadDays;
    const end = parseDayNum(range[1]);
    if (today >= start && today <= end) return true;
  }
  return false;
}

export function currentSeason(now: Date = new Date()): Season {
  // KST = UTC+9 (DST 없음)
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const today = dayNum(y, m, d);

  if (inHolidayWindow(SEOLLAL_HOLIDAYS, y, today, 7)) return "seollal";
  if (inHolidayWindow(CHUSEOK_HOLIDAYS, y, today, 7)) return "chuseok";
  if (m === 12 && d >= 11 && d <= 25) return "christmas";

  const md = m * 100 + d;
  if (md >= 204 && md <= 505) return "spring";
  if (md >= 506 && md <= 807) return "summer";
  if (md >= 808 && md <= 1106) return "autumn";
  return "winter";
}

export function seasonalCharacterImage(characterId: string, now?: Date): string {
  return `/characters/seasonal/${currentSeason(now)}/${characterId}.png`;
}

/** 채팅방 전용 정사각 프로필 사진 (헤더·말풍선 아바타). 스트리트 목록의 창호 이미지와 별개. */
export function seasonalProfileImage(characterId: string, now?: Date): string {
  return `/characters/profile/${currentSeason(now)}/${characterId}.png`;
}
