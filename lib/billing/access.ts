import { supabaseAdmin } from "@/lib/db/client";

// 무료 사용자가 사주거리 채팅에서 보낼 수 있는 누적 메시지 수 (전체 캐릭터 합산)
export const FREE_CHAT_MESSAGE_LIMIT = 20;

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

/** 사용자가 모든 캐릭터에 보낸 user 메시지 누적 개수. */
export async function countUserChatMessages(userId: string): Promise<number> {
  const { data: convs } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  const ids = (convs ?? []).map((c) => c.id);
  if (ids.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user");

  return count ?? 0;
}
