import { z } from "zod";
import { kstYear } from "@/lib/time/kst";

/**
 * 무료 리포트 라우트 공통 입력 검증(2026-10-04 보안 점검).
 * 이전에는 본문을 검증 없이 구조분해해, 형식이 틀린 값이 그대로 프롬프트에 들어가거나
 * (날짜·목적 문자열) 광고 토큰만 소모한 채 AI가 "계산 데이터 없음"으로 엉뚱한 글을 썼다.
 * 이제 토큰 소비·AI 호출 전에 걸러 400으로 돌려준다.
 */
const MIN_YEAR = 1900;


const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  })
  .refine((s) => Number(s.slice(0, 4)) >= MIN_YEAR && Number(s.slice(0, 4)) <= kstYear());

const rangeDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)))
  .refine((s) => Number(s.slice(0, 4)) >= MIN_YEAR && Number(s.slice(0, 4)) <= kstYear() + 5);

const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const gender = z.enum(["M", "F"]);
const adToken = z.string().min(1).max(200);

const clean = <T extends z.ZodTypeAny>(s: T) => s.nullish().transform((v) => v ?? undefined);

export const freeReportSchema = z.object({
  ad_token: adToken,
  extra: z.object({ birth_date: dateStr, birth_time: timeStr.nullish().transform((v) => v ?? null), gender }),
});

export const freeCompatSchema = z.object({
  ad_token: adToken,
  my_birth: dateStr,
  my_gender: gender,
  other_birth: dateStr,
  other_gender: gender,
  context: z.enum(["romance", "work", "friend"]).nullish().transform((v) => v ?? "romance"),
});

export const freeTaekilSchema = z.object({
  ad_token: adToken,
  birth_date: dateStr,
  gender,
  purpose: z.enum(["wedding", "move", "business", "travel", "surgery", "other"]).nullish().transform((v) => v ?? "other"),
  range_from: clean(rangeDate),
  range_to: clean(rangeDate),
});

export const freeYearlySchema = z.object({
  ad_token: adToken,
  birth_date: dateStr,
  gender,
  year: z
    .union([z.number(), z.string().regex(/^\d{4}$/).transform(Number)])
    .nullish()
    .transform((v) => v ?? undefined)
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= MIN_YEAR && v <= kstYear() + 5)),
});

export type FreeParse<T> = { ok: true; data: T } | { ok: false };

export function parseFree<S extends z.ZodTypeAny>(schema: S, raw: unknown): FreeParse<z.output<S>> {
  const r = schema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false };
}

export const BAD_INPUT = { error: "입력값을 확인해주세요." } as const;
