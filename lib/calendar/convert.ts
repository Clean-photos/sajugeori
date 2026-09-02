/**
 * calendar-convert.ts — 음력↔양력 변환 레이어.
 *
 * 계산 엔진은 손대지 않는다. 엔진은 양력만 받으므로, 음력 입력을 엔진에 넣기
 * 전에 여기서 양력으로 바꿔 준다(앞단 변환 구조).
 *
 * korean-lunar-calendar를 쓰는 이유: 한국천문연구원(KASI) 기준이다. 한국 음력은
 * 시간대 차이 때문에 중국 음력과 하루 어긋나는 해가 있어, 중국 기준 라이브러리를
 * 쓰면 일부 사용자에게 하루 틀린 사주가 나간다 — 고치려는 문제를 다른 형태로
 * 반복하게 된다(CEO 판단, 2026-09-02).
 *
 * 지원 범위 밖(라이브러리가 다루지 못하는 연도)이나 존재하지 않는 날짜가 들어오면
 * 조용히 틀린 값을 돌려주는 대신 실패를 명시한다 — 사주는 하루만 어긋나도 결과가
 * 통째로 달라지므로, 애매하면 계산하지 않는 편이 맞다.
 */
import KoreanLunarCalendar from "korean-lunar-calendar";

export type CalendarKind = "solar" | "lunar" | "lunar-leap";

export interface ConvertResult {
  ok: true;
  /** 엔진에 넣을 양력 날짜 "YYYY-MM-DD" */
  solar: string;
  /** 같은 날의 음력 표기 "YYYY-MM-DD" (윤달이면 isLeap true) */
  lunar: string;
  isLeap: boolean;
}
export interface ConvertError {
  ok: false;
  error: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(date: string): { y: number; m: number; d: number } | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function fmt(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 음력 표기가 필요한 화면을 위해 양력 → 음력만 구한다. 실패하면 null. */
export function solarToLunar(date: string): { lunar: string; isLeap: boolean } | null {
  const p = parse(date);
  if (!p) return null;
  try {
    const cal = new KoreanLunarCalendar();
    if (!cal.setSolarDate(p.y, p.m, p.d)) return null;
    const l = cal.getLunarCalendar();
    if (!l) return null;
    return { lunar: fmt(l.year, l.month, l.day), isLeap: !!l.intercalation };
  } catch {
    return null;
  }
}

/**
 * 입력 역법을 양력으로 정규화한다. 모든 입력 경로가 엔진 호출 전에 이걸 통과해야 한다.
 *
 * 반환값에는 변환된 양력과 그에 대응하는 음력이 함께 담긴다 — 입력 폼에서
 * "이 날짜가 맞는지" 즉시 보여 주기 위한 것이고, 이 한 줄이 오입력을 크게 줄인다.
 */
export function toSolar(date: string, kind: CalendarKind): ConvertResult | ConvertError {
  const p = parse(date);
  if (!p) return { ok: false, error: "생년월일 형식을 확인해 주세요." };

  if (kind === "solar") {
    // 양력이라도 존재하지 않는 날짜(2월 30일 등)는 걸러야 한다. Date는 그런 값을
    // 조용히 다음 달로 넘겨 버리므로, 되돌려 비교해 실제로 같은 날인지 확인한다.
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
    if (
      dt.getUTCFullYear() !== p.y ||
      dt.getUTCMonth() !== p.m - 1 ||
      dt.getUTCDate() !== p.d
    ) {
      return { ok: false, error: "존재하지 않는 날짜입니다. 생년월일을 확인해 주세요." };
    }
    const l = solarToLunar(date);
    return { ok: true, solar: date, lunar: l?.lunar ?? "", isLeap: l?.isLeap ?? false };
  }

  const isLeap = kind === "lunar-leap";
  try {
    const cal = new KoreanLunarCalendar();
    if (!cal.setLunarDate(p.y, p.m, p.d, isLeap)) {
      return {
        ok: false,
        error: isLeap
          ? "그 해에는 해당 윤달이 없습니다. 음력(평달)인지 확인해 주세요."
          : "존재하지 않는 음력 날짜입니다. 생년월일을 확인해 주세요.",
      };
    }
    const s = cal.getSolarCalendar();
    if (!s) return { ok: false, error: "음력 변환에 실패했습니다. 생년월일을 확인해 주세요." };
    return { ok: true, solar: fmt(s.year, s.month, s.day), lunar: date, isLeap };
  } catch {
    return { ok: false, error: "음력 변환에 실패했습니다. 생년월일을 확인해 주세요." };
  }
}

/** 화면에 그대로 쓸 수 있는 역법 표기. */
export function calendarLabel(kind: CalendarKind): string {
  return kind === "solar" ? "양력" : kind === "lunar-leap" ? "음력(윤달)" : "음력(평달)";
}
