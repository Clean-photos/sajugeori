import { supabaseAdmin } from "@/lib/db/client";
import { REPORT_PRODUCTS, DESTINY_BLUEPRINT_ONE, DESTINY_UPGRADE } from "@/lib/billing/plans";

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
 * 미사용 단건 이용권을 실제로 "쓸 수 있는" 상태인가 — 프로모션 이용권 배포용(2026-09-22
 * CEO 지시). 지금까지 각 상품 라우트는 캐시를 게이트보다 먼저 봤다(§ "캐시를 게이트보다
 * 먼저 본다" 주석 — 기결제 사용자가 재생성 없이 무료로 다시 볼 수 있게 하려는 의도였다).
 * 그런데 이 순서 때문에, 이미 그 프로필로 리포트를 한 번이라도 만들어 둔 사용자는
 * 새로 받은 이용권을 그 프로필에는 절대 쓸 수 없었다 — 캐시가 항상 먼저 걸려 이용권
 * 소진 코드에 도달하지 못한다. 유일한 우회는 "결과 삭제하기"로 기존 캐시를 지우는
 * 것뿐이었는데, 프로모션으로 뿌린 이용권을 쓰라면서 자기 결과부터 지우라고 할 순 없다.
 *
 * 구독자는 대상이 아니다 — 구독자는 이미 무제한 무료 열람이 보장되고, 이 함수가
 * true를 반환하면 캐시를 건너뛰고 재생성하므로(비용 발생) 구독자에게 적용하면
 * 이유 없이 생성 비용만 는다. 순수하게 "지금 쓸 수 있는 단건 이용권이 있는가"만 본다.
 */
export async function hasUnusedPassForRegenerate(userId: string, productId: string): Promise<boolean> {
  return (await findUnusedOneTimePass(userId, productId)) !== null;
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

/**
 * 운명 설계도 열람 권한 확인 + 이용권 선점. 구독자는 무료, 아니면 미사용
 * 이용권(직구매 또는 업그레이드)을 그 자리에서 선점한다 — checkReportAccess와
 * 같은 레이스 수정(claimOneTimePass 주석 참고). ANY_REPORT_PASS 폴백은 쓰지
 * 않는다(findUnusedDestinyPass와 동일 이유 — 묶음권은 990원 상품 전용).
 */
export async function checkDestinyAccess(userId: string): Promise<{ allowed: boolean; passId: string | null }> {
  if (await isPremiumUser(userId)) return { allowed: true, passId: null };
  const passId = await claimOneTimePass(userId, [DESTINY_BLUEPRINT_ONE.id, DESTINY_UPGRADE.id]);
  return { allowed: passId !== null, passId };
}

/**
 * 운명 설계도 "업그레이드가(6,900원)" 자격 여부. 이 사용자의 프리미엄 사주
 * 리포트(saju_one)가 reports에 남아 있으면 유효 — 별도 만료 타이머 없이
 * 리포트 수명(1년)에 자연히 묶인다. 리포트가 배치로 삭제되면 이 자격도 함께 사라진다.
 */
export async function hasSajuReport(userId: string): Promise<boolean> {
  try {
    const { count } = await supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("product_id", "saju_one");
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

export interface UnusedPass {
  productId: string;
  count: number;
  label: string;
  href: string;
}

/**
 * §0-3②(CoS 실물 재검증, 2026-09-10): 홈의 "사용하지 않은 이용권 N장 · 지금
 * 만들기"가 개수만 보여주고 어떤 상품인지 알려주지 않은 채 /premium/menu로만
 * 보냈다 — 8개 상품 중 뭘 안 만들었는지 사용자가 추측해야 했다. product_id별로
 * 묶어 상품명과 그 상품 생성 화면으로 바로 가는 링크를 낸다. any_report(옛
 * 묶음권)는 특정 상품 하나에 묶이지 않아 예외적으로 메뉴로 보낸다.
 */
export async function listUnusedPasses(userId: string): Promise<UnusedPass[]> {
  try {
    const { data } = await supabaseAdmin
      .from("one_time_purchases")
      .select("product_id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .is("used_at", null);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const pid = row.product_id as string;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    const out: UnusedPass[] = [];
    for (const [productId, count] of counts) {
      if (productId === ANY_REPORT_PASS) {
        out.push({ productId, count, label: "리포트 아무거나(묶음권)", href: "/premium/menu" });
        continue;
      }
      const product = REPORT_PRODUCTS.find((p) => p.productId === productId);
      if (product) {
        out.push({ productId, count, label: product.label, href: product.path });
        continue;
      }
      if (productId === DESTINY_BLUEPRINT_ONE.id || productId === DESTINY_UPGRADE.id) {
        out.push({ productId, count, label: "운명 설계도", href: "/premium/destiny" });
        continue;
      }
      out.push({ productId, count, label: "리포트", href: "/premium/menu" });
    }
    return out.sort((a, b) => b.count - a.count);
  } catch {
    return [];
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
 * 미사용 이용권 하나를 그 자리에서 원자적으로 선점한다(SELECT 따로, UPDATE 따로
 * 하던 findUnusedOneTimePass와 달리 "찾는 동시에 표시"까지 한 번에 끝낸다).
 *
 * §레이스(2026-07-19 발견, 2026-10-02 수정): 예전엔 생성 "성공 후"에 소진해서,
 * 같은 이용권으로 동시에 2번 요청하면 둘 다 "미사용"을 보고 통과해 LLM 비용이
 * 중복 발생했다(findUnusedOneTimePass의 SELECT와 consumeOneTimePass의 UPDATE
 * 사이에 틈이 있었음). 이 함수는 그 틈을 없앤다 — 후보를 찾은 즉시 조건부
 * UPDATE(.is("used_at", null))로 선점을 시도하고, 다른 요청이 먼저 가져갔으면
 * (영향받은 행 0개) 같은 product_id 안에서 다음 후보로 재시도한다.
 *
 * findUnusedOneTimePass 자체는 건드리지 않는다 — 여러 화면이 "이용권이 있나?"만
 * 가볍게 물어볼 때 쓰는 순수 조회라(_PremiumGate, premium/page.tsx, destiny/page.tsx,
 * payments/prepare 등), 그 함수를 선점형으로 바꾸면 조회만 했는데 이용권이 소진되는
 * 훨씬 심각한 버그가 된다. 실제로 "쓰겠다"고 확정하는 지점(checkReportAccess·
 * checkDestinyAccess)에서만 이 선점 함수를 쓴다.
 *
 * export하는 이유: app/api/premium/yearly/route.ts는 checkReportAccess를 캐시
 * 건너뛰기 판단(hasUnusedPassForRegenerate)보다 먼저 호출하는 구조라, checkReportAccess
 * 안에서 바로 선점해버리면 그 직후의 hasUnusedPassForRegenerate가 "이미 선점돼
 * 방금 없어진" 이용권을 못 보고 캐시로 새 버전을 건너뛰어야 할 요청을 캐시로
 * 돌려보낸다(프로모션 이용권 기능 자체가 깨짐). 그 라우트는 이 함수를 직접 가져다
 * "생성 직전"에만 선점하도록 순서를 조정해 쓴다.
 */
export async function claimOneTimePass(userId: string, productIds: string[]): Promise<string | null> {
  for (const pid of productIds) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: candidate } = await supabaseAdmin
        .from("one_time_purchases")
        .select("id")
        .eq("user_id", userId).eq("product_id", pid).eq("status", "paid")
        .is("used_at", null)
        .order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      if (!candidate?.id) break; // 이 product_id엔 더 없음 — 다음 product_id로
      const { data: claimed } = await supabaseAdmin
        .from("one_time_purchases")
        .update({ used_at: new Date().toISOString() })
        .eq("id", candidate.id).is("used_at", null)
        .select("id").maybeSingle();
      if (claimed?.id) return claimed.id;
      // 동시 요청이 먼저 가져갔다 — 같은 product_id 안에서 다음 후보로 재시도
    }
  }
  return null;
}

/**
 * 리포트 열람 권한 확인 + 이용권 선점.
 *
 * 구독자면 이용권을 쓰지 않고 통과시키고, 아니면 단건 이용권을 그 자리에서
 * 선점한다(claimOneTimePass). 생성이 실패하면 호출부가 refundOneTimePass로
 * 되돌려야 한다 — 성공 후 별도로 consumeOneTimePass를 또 부를 필요는 없다
 * (이미 선점 시점에 소진 처리됨).
 */
export async function checkReportAccess(
  userId: string,
  productId: string
): Promise<{ allowed: boolean; passId: string | null }> {
  if (await isPremiumUser(userId)) return { allowed: true, passId: null };
  const passId = await claimOneTimePass(userId, [productId, ANY_REPORT_PASS]);
  return { allowed: passId !== null, passId };
}

/** 생성이 실패했을 때 선점했던 이용권을 되돌린다(claimOneTimePass와 짝). */
export async function refundOneTimePass(passId: string): Promise<void> {
  await supabaseAdmin
    .from("one_time_purchases")
    .update({ used_at: null })
    .eq("id", passId);
}

/**
 * @deprecated claimOneTimePass가 선점 시점에 이미 소진 처리한다. 과거 코드와의
 * 호환을 위해 남겨 두되, 이미 소진된(used_at not null) 행에는 조건부 UPDATE가
 * 아무 영향을 주지 않으므로 호출해도 안전하게 아무 일도 안 일어난다.
 */
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
