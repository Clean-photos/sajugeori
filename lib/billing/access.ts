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

/**
 * 묶음권으로 받은 이용권의 product_id.
 * 특정 리포트에 묶이지 않고 아무 리포트에나 한 번 쓸 수 있다.
 */
export const ANY_REPORT_PASS = "any_report";

/**
 * 미사용 단건 이용권 id. 없으면 null. (테이블 미생성 시에도 null)
 *
 * 해당 리포트 전용 이용권을 먼저 찾고, 없으면 묶음권 이용권을 찾는다.
 * 전용권을 먼저 쓰는 이유는 묶음권이 다른 리포트에도 쓸 수 있어 더 유연하기 때문이다.
 */
export async function findUnusedOneTimePass(userId: string, productId: string): Promise<string | null> {
  for (const pid of [productId, ANY_REPORT_PASS]) {
    try {
      const { data } = await supabaseAdmin
        .from("one_time_purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", pid)
        .eq("status", "paid")
        .is("used_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.id) return data.id;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 운명 설계도 미사용 이용권 id. destiny_blueprint_one(직구매)과 destiny_upgrade(업그레이드)
 * 둘 다 인정하지만, ANY_REPORT_PASS(옛 묶음권) 폴백은 쓰지 않는다 — 묶음권은 990원짜리
 * 6종 리포트용이었고 운명 설계도(7,900원)는 별도 상품이라 섞이면 안 된다.
 */
export async function findUnusedDestinyPass(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("one_time_purchases")
      .select("id")
      .eq("user_id", userId)
      .in("product_id", ["destiny_blueprint_one", "destiny_upgrade"])
      .eq("status", "paid")
      .is("used_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/** 운명 설계도 열람 권한 확인. 구독자는 무료, 아니면 미사용 이용권(직구매 또는 업그레이드)이 있어야 한다. */
export async function checkDestinyAccess(userId: string): Promise<{ allowed: boolean; passId: string | null }> {
  if (await isPremiumUser(userId)) return { allowed: true, passId: null };
  const passId = await findUnusedDestinyPass(userId);
  return { allowed: passId !== null, passId };
}

/**
 * 운명 설계도 "업그레이드가(6,900원)" 자격 여부. premium_reports에 이 사용자의
 * 프리미엄 사주 리포트가 남아 있으면 유효 — 별도 만료 타이머 없이 리포트
 * 수명(1년)에 자연히 묶인다. 리포트가 배치로 삭제되면 이 자격도 함께 사라진다.
 */
export async function hasSajuReport(userId: string): Promise<boolean> {
  try {
    const { count } = await supabaseAdmin
      .from("premium_reports")
      .select("saju_profile_id", { count: "exact", head: true })
      .eq("user_id", userId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** 사용자가 남긴 묶음권 이용권 장수 (결과 화면에 "N회 남음" 표시용) */
export async function countRemainingPasses(userId: string): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from("one_time_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid")
      .is("used_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 이 사용자가 구매 이력이 있는 상품 id 집합(상태 불문 — 환불된 것도 "산 적 있음"으로
 * 친다. 환불한 상품을 다시 사라고 홈에서 권하는 건 별개의 CS 대화지 크로스셀
 * 대상이 아니다).
 *
 * 홈 화면 "아직 구매하지 않은 리포트" 블록(§1, CEO 결정 2026-09-03)에 쓴다 —
 * REPORT_PRODUCTS 중 이 집합에 없는 것만 추천 대상이다.
 */
export async function purchasedProductIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin
      .from("one_time_purchases")
      .select("product_id")
      .eq("user_id", userId);
    return new Set((data ?? []).map((r) => r.product_id as string));
  } catch {
    return new Set();
  }
}

/**
 * 리포트 열람 권한 확인.
 *
 * 구독자면 이용권을 쓰지 않고 통과시키고, 아니면 단건 이용권을 찾는다.
 * 반환된 passId는 리포트 생성이 성공한 뒤 consumeOneTimePass로 소진해야 한다.
 * 생성 전에 소진하면 실패했을 때 이용권만 날아간다.
 */
export async function checkReportAccess(
  userId: string,
  productId: string
): Promise<{ allowed: boolean; passId: string | null }> {
  if (await isPremiumUser(userId)) return { allowed: true, passId: null };
  const passId = await findUnusedOneTimePass(userId, productId);
  return { allowed: passId !== null, passId };
}

/** 단건 이용권 소진 처리. 리포트 생성이 성공한 뒤에만 호출할 것. */
export async function consumeOneTimePass(passId: string): Promise<void> {
  await supabaseAdmin
    .from("one_time_purchases")
    .update({ used_at: new Date().toISOString() })
    .eq("id", passId)
    .is("used_at", null);
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
