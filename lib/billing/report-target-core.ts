/**
 * report-target-core.ts — 대상 사주 확정 레이어의 **순수 로직**.
 *
 * DB(supabase)를 타는 함수와 분리해 둔 이유: 여기 있는 것들이 조용히 틀렸을 때
 * 피해가 가장 크다(ISO가 깨지면 간지가 전부 undefined, 시각 표기 차이로 본인
 * 사주를 남으로 오판). DB 없이 바로 테스트할 수 있어야 해서 파일을 나눴다.
 * 실제 사용은 report-target.ts가 전부 re-export 하므로 호출부는 그대로 둔다.
 */

export interface TargetInput {
  birthDate: string;
  /** null = 시각 모름(시주 제외) */
  birthTime: string | null;
  gender: "M" | "F";
  calendar: "solar" | "lunar";
}

export interface OwnProfile {
  id: string;
  birth_date: string;
  birth_time: string | null;
  gender: string;
  calendar: string;
}

/** UNIQUE 컬럼에 NULL을 넣지 않기 위한 정규화(016과 동일 규칙). "HH:MM:SS" → "HH:MM" */
export function timeKeyOf(birthTime: string | null): string {
  return birthTime ? birthTime.slice(0, 5) : "";
}

/** 요청 body에서 대상 사주를 파싱·검증한다. 형식이 틀리면 error 문자열을 돌려준다. */
export function parseTargetBody(body: unknown): { ok: true; input: TargetInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const birthDate = typeof b.birth_date === "string" ? b.birth_date : "";
  const rawTime = typeof b.birth_time === "string" && b.birth_time ? b.birth_time : null;
  const gender = b.gender === "M" || b.gender === "F" ? b.gender : null;
  const calendar = b.calendar === "lunar" ? "lunar" : "solar";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !gender) {
    return { ok: false, error: "생년월일과 성별을 확인해주세요." };
  }
  // "HH:MM" 또는 "HH:MM:SS"만 허용. 형식이 깨진 채로 넘어가면 buildChart가 조용히
  // Invalid Date를 만들어 간지가 전부 undefined가 된다(2026-09-02 실제 사고).
  if (rawTime !== null && !/^\d{2}:\d{2}(:\d{2})?$/.test(rawTime)) {
    return { ok: false, error: "태어난 시각 형식을 확인해주세요." };
  }
  return { ok: true, input: { birthDate, birthTime: rawTime, gender, calendar } };
}

/** 입력한 대상이 등록된 본인 사주와 같은 사람인지. 시각은 "HH:MM"까지만 비교한다. */
export function sameAsProfile(input: TargetInput, profile: OwnProfile): boolean {
  return (
    input.birthDate === profile.birth_date &&
    timeKeyOf(input.birthTime) === timeKeyOf(profile.birth_time) &&
    input.gender === profile.gender
  );
}

/**
 * buildChart/runSajuEngine에 넘길 ISO 문자열.
 * birth_time은 이미 "HH:MM" 또는 "HH:MM:SS"이므로 초를 덧붙이지 않는다 —
 * 덧붙이면 "…T14:30:00:00"이 되어 Invalid Date가 된다(2026-09-02 실제 사고).
 */
export function isoOf(input: TargetInput): string {
  if (!input.birthTime) return `${input.birthDate}T00:00:00`;
  const t = input.birthTime.length === 5 ? `${input.birthTime}:00` : input.birthTime;
  return `${input.birthDate}T${t}`;
}

