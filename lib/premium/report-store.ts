import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { hasUnusedPassForRegenerate } from "@/lib/billing/access";
import { reportExpiresAtIso, notExpiredFilter } from "@/lib/billing/report-ttl";
import {
  readAdhocCache, writeAdhocCache, ensureOwnProfileId, loadOwnProfile, sameAsProfile, timeKeyOf,
  type TargetInput, type OwnProfile,
} from "@/lib/billing/report-target";

/**
 * 프리미엄 리포트 저장·조회·삭제 공통 (2026-10-04 리팩터).
 * 규칙(016/022): 대상이 등록된 본인 사주면 reports에, 다른 사람이면 1회성 캐시(premium_adhoc_reports)에 둔다.
 */
export interface ReportKey {
  userId: string;
  productId: string;
  target: TargetInput;
  ownProfile: OwnProfile | null;
  isAdhoc: boolean;
  variant?: string;
}

export interface CachedReport<T> { content: T; id: string | null; adhoc: boolean }

/**
 * 이미 만든 리포트가 있으면 돌려준다(재열람 무료). 단, 지금 쓸 수 있는 미사용 단건 이용권이 있으면
 * 건너뛴다 — 안 그러면 프로모션 이용권이 영영 안 쓰인다(구독자는 대상이 아니다).
 */
export async function findCached<T>(
  k: ReportKey,
  isPassPending: typeof hasUnusedPassForRegenerate = hasUnusedPassForRegenerate
): Promise<CachedReport<T> | null> {
  if (await isPassPending(k.userId, k.productId)) return null;
  const variant = k.variant ?? "";
  if (k.isAdhoc) {
    const content = await readAdhocCache<T>(k.userId, k.productId, k.target, variant);
    return content ? { content, id: null, adhoc: true } : null;
  }
  if (!k.ownProfile?.id) return null;
  try {
    const { data } = await supabaseAdmin
      .from("reports").select("id, content")
      .eq("profile_id", k.ownProfile.id).eq("product_id", k.productId).eq("variant", variant)
      .or(notExpiredFilter()).limit(1).maybeSingle();
    return data?.content ? { content: data.content as T, id: data.id ?? null, adhoc: false } : null;
  } catch {
    return null; // 테이블 없음 등 → 생성으로 진행
  }
}

/**
 * 생성한 리포트를 저장하고 저장된 행의 id를 돌려준다(1회성은 null).
 * 본인 케이스 저장이 실패하면 1회성 캐시로라도 남긴다 — 결제한 리포트가 어디에도 없는 사고를 막는다
 * (CoS 2026-09-29: 결제 내역엔 "사용함"인데 리포트 목록엔 없던 증상).
 */
export async function saveReport(
  k: ReportKey,
  content: unknown,
  extra?: Record<string, unknown>
): Promise<string | null> {
  const variant = k.variant ?? "";
  if (k.isAdhoc) {
    await writeAdhocCache(k.userId, k.productId, k.target, content, variant);
    return null;
  }
  const profileId = await ensureOwnProfileId(k.userId, k.target, k.ownProfile);
  if (!profileId) return null;
  try {
    // upsert 충돌 시 created_at DEFAULT가 다시 안 타 재생성해도 생성일이 그대로였다(QA 2026-09-05 D-2) — 명시 갱신.
    const row: Record<string, unknown> = {
      profile_id: profileId, product_id: k.productId, variant, user_id: k.userId, content,
      expires_at: reportExpiresAtIso(), created_at: new Date().toISOString(),
    };
    if (extra) row.extra = extra;
    const { data, error } = await supabaseAdmin
      .from("reports").upsert(row, { onConflict: "profile_id,product_id,variant" }).select("id").single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (e) {
    console.error(`${k.productId} 저장 실패, 1회성 캐시로 폴백:`, e);
    await writeAdhocCache(k.userId, k.productId, k.target, content, variant);
    return null;
  }
}

/** 저장본 재열람 화면은 행의 정확한 PK를 안다 — "지금의 본인 프로필"로 되짚지 않고 소유자만 확인해 지운다. */
export async function deleteById(userId: string, productId: string, id: string): Promise<NextResponse> {
  await supabaseAdmin.from("reports").delete().eq("id", id).eq("user_id", userId).eq("product_id", productId);
  return NextResponse.json({ ok: true });
}

/**
 * 대상(+variant)으로 리포트를 지운다. 대상이 등록된 본인 사주와 다르면 1회성 캐시에서,
 * 같거나 대상이 없으면 본인 리포트에서 지운다(대상을 안 받으면 가족 리포트를 지우려다 본인 것이 지워진다).
 */
export async function deleteByTarget(opts: {
  userId: string; productId: string; target: TargetInput | null; variant: string;
}): Promise<NextResponse> {
  const { userId, productId, target, variant } = opts;
  const ownProfile = await loadOwnProfile(userId);

  if (target && ownProfile && !sameAsProfile(target, ownProfile)) {
    await supabaseAdmin.from("premium_adhoc_reports").delete()
      .eq("user_id", userId).eq("product_id", productId)
      .eq("birth_date", target.birthDate).eq("birth_time", timeKeyOf(target.birthTime))
      .eq("gender", target.gender).eq("variant", variant);
    return NextResponse.json({ ok: true });
  }

  if (!ownProfile?.id) {
    return NextResponse.json({ error: "profile_required" }, { status: 403 });
  }
  await supabaseAdmin.from("reports").delete()
    .eq("profile_id", ownProfile.id).eq("product_id", productId).eq("user_id", userId).eq("variant", variant);
  return NextResponse.json({ ok: true });
}
