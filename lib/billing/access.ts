import { supabaseAdmin } from "@/lib/db/client";

// 무료 사용자가 사주거리 채팅에서 보낼 수 있는 누적 메시지 수 (전체 캐릭터 합산)
export const FREE_CHAT_MESSAGE_LIMIT = 20;

// 프리미엄 사용자의 월간 채팅 한도 (공정 사용 정책 — 매월 1일 KST 기준 초기화).
// 헤비유저 원가 상한: Sonnet 5 정가 기준 1,000턴 ≈ $10 수준.
export const PREMIUM_MONTHLY_CHAT_LIMIT = 1000;

/** 활성 구독(프리미엄) 여부. expires_at이 미래인 active 구독이 있으면 true. */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;
  if (!data.expires_at) return true; // 만료일 없으면 활성으로 간주
  return new Date(data.expires_at).getTime() > Date.now();
}

/** 사용자가 모든 캐릭터에 보낸 user 메시지 누적 개수. sinceIso를 주면 그 시점 이후만 센다. */
export async function countUserChatMessages(userId: string, sinceIso?: string): Promise<number> {
  const { data: convs } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  const ids = (convs ?? []).map((c) => c.id);
  if (ids.length === 0) return 0;

  let query = supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user");
  if (sinceIso) query = query.gte("created_at", sinceIso);

  const { count } = await query;
  return count ?? 0;
}

/** 이번 달 1일 0시(KST)의 ISO 문자열 — 프리미엄 월간 한도 기준점. */
export function currentMonthStartKstIso(): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  // KST 1일 00:00 = UTC 전날 15:00
  return new Date(Date.UTC(y, m, 1) - 9 * 60 * 60 * 1000).toISOString();
}
