import { supabaseAdmin } from "@/lib/db/client";

/**
 * DB 기반 요청 횟수 제한(023_rate_limits.sql). 별도 인프라(Redis 등) 없이 Supabase만 쓴다.
 *
 * 설계 원칙
 *  - fail-open: 테이블이 없거나 DB가 불안정해도 서비스는 막지 않는다(제한이 잠시 꺼질 뿐).
 *  - 판정(isLimited)과 기록(recordHit)을 분리 — 로그인처럼 "실패만" 세야 하는 경우에 쓴다.
 *  - 동시 요청 몇 건이 한도를 살짝 넘길 수는 있다(남용 방어 목적이라 허용).
 */
export interface Window { limit: number; windowSec: number }

export async function isLimited(kind: string, key: string, w: Window): Promise<boolean> {
  try {
    const since = new Date(Date.now() - w.windowSec * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind).eq("key", key).gte("created_at", since);
    if (error) return false;
    return (count ?? 0) >= w.limit;
  } catch {
    return false;
  }
}

export async function recordHit(kind: string, key: string): Promise<void> {
  try {
    await supabaseAdmin.from("rate_limit_events").insert({ kind, key });
  } catch {
    /* 기록 실패는 무시(fail-open) */
  }
}

/** 한도 안이면 1건 기록하고 true, 넘었으면 기록 없이 false. */
export async function consume(kind: string, key: string, ...windows: Window[]): Promise<boolean> {
  for (const w of windows) {
    if (await isLimited(kind, key, w)) return false;
  }
  await recordHit(kind, key);
  return true;
}

/** Vercel은 x-forwarded-for를 덮어써 첫 값이 실제 접속자다. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() || "unknown";
}

/** 메일·인증 링크에 쓸 사이트 주소 — 프로덕션에선 요청 헤더가 아니라 고정 정본 URL. */
export function siteOrigin(reqOrigin: string, siteUrl: string): string {
  return process.env.NODE_ENV === "production" ? siteUrl : reqOrigin;
}

export const LIMITS = {
  adToken: [
    { limit: 30, windowSec: 600 },
    { limit: 150, windowSec: 86400 },
  ] as Window[],
  loginFailEmail: { limit: 8, windowSec: 900 } as Window,
  loginFailIp: { limit: 40, windowSec: 900 } as Window,
  signupIp: { limit: 8, windowSec: 3600 } as Window,
  forgotEmail: { limit: 3, windowSec: 3600 } as Window,
  forgotIp: { limit: 15, windowSec: 3600 } as Window,
  resetIp: { limit: 20, windowSec: 3600 } as Window,
  changePwFailUser: { limit: 5, windowSec: 900 } as Window,
};

/** 무료 AI 하루 전체 상한(비용 안전장치). 환경변수 FREE_LLM_DAILY_CAP로 조정. */
export function freeLlmDailyCap(): Window {
  const n = Number(process.env.FREE_LLM_DAILY_CAP);
  return { limit: Number.isFinite(n) && n > 0 ? n : 5000, windowSec: 86400 };
}

export async function freeCapReached(): Promise<boolean> {
  return isLimited("free_llm", "global", freeLlmDailyCap());
}
export async function recordFreeLlm(): Promise<void> {
  await recordHit("free_llm", "global");
}
