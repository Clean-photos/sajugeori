/**
 * report-target.ts — "이 리포트를 누구 사주로 만들 것인가"를 결정하는 공통 레이어.
 *
 * 왜 필요한가: 지금까지 모든 유료 라우트가
 *   .eq("label","본인").order("created_at", desc).limit(1)
 * 로 **마지막에 등록한 사주**를 말없이 물려받았다. 그래서 가족 사주를 보려고 다시
 * 결제해도 대상을 바꿀 방법이 없었다(CEO 실테스트 재현, 2026-08-31).
 *
 * 저장 규칙은 016(프리미엄 사주 직접입력)이 이미 정해 둔 것을 그대로 따른다.
 *   - 등록된 사주가 **없던** 사람: 입력값을 본인 프로필로 저장한다(온보딩과 동일).
 *     이후 리포트는 기존처럼 saju_profile_id 기준 캐시에 들어간다.
 *   - 등록된 사주가 **있는** 사람이 그와 **다른** 사주를 넣으면: 1회성으로 본다.
 *     본인 프로필을 덮어쓰지 않고 premium_adhoc_reports에 따로 캐시한다.
 *   - 등록된 사주와 **같은** 값을 넣으면: 1회성이 아니라 본인 케이스로 처리한다.
 *     (체크박스로 불러온 뒤 그대로 컨펌하는 경로가 여기다 — 매번 새 캐시를 만들면
 *      이미 결제해 만든 본인 리포트를 다시 못 열게 된다)
 */
import { supabaseAdmin } from "@/lib/db/client";
import { runSajuEngine } from "@/lib/saju-engine";
import { reportExpiresAtIso, notExpiredFilter } from "./report-ttl";
import { timeKeyOf, sameAsProfile, type TargetInput, type OwnProfile } from "./report-target-core";

// 순수 로직은 report-target-core.ts에 있다(DB 없이 테스트하기 위해 분리).
// 호출부가 import 경로를 신경 쓰지 않도록 여기서 그대로 다시 내보낸다.
export { timeKeyOf, parseTargetBody, sameAsProfile, isoOf } from "./report-target-core";
export type { TargetInput, OwnProfile } from "./report-target-core";

export interface ResolvedTarget {
  input: TargetInput;
  /** 로그인 사용자의 등록된 본인 사주(없으면 null) */
  ownProfile: OwnProfile | null;
  /**
   * true면 본인 프로필을 건드리지 않고 premium_adhoc_reports에 캐시한다.
   * 등록된 사주가 있고, 입력값이 그와 다를 때만 true.
   */
  isAdhoc: boolean;
}

/** 로그인 사용자의 등록된 본인 사주를 읽는다(없으면 null). */
export async function loadOwnProfile(userId: string): Promise<OwnProfile | null> {
  const { data } = await supabaseAdmin
    .from("saju_profiles")
    .select("id, birth_date, birth_time, gender, calendar")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as OwnProfile | null) ?? null;
}

/** 대상 사주를 확정한다. 라우트는 이 결과의 isAdhoc으로 캐시 경로를 가른다. */
export async function resolveTarget(userId: string, input: TargetInput): Promise<ResolvedTarget> {
  const ownProfile = await loadOwnProfile(userId);
  const isAdhoc = !!ownProfile && !sameAsProfile(input, ownProfile);
  return { input, ownProfile, isAdhoc };
}

/**
 * 등록된 사주가 없던 사람의 입력을 본인 프로필로 저장한다(016 규칙).
 * 실패해도 리포트 생성은 계속돼야 하므로 예외를 던지지 않고 null을 돌려준다.
 */
export async function saveAsOwnProfile(
  userId: string,
  input: TargetInput,
  engine: { saju_raw: unknown; saju_json: unknown }
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("saju_profiles")
    .insert({
      user_id: userId, label: "본인",
      birth_date: input.birthDate, birth_time: input.birthTime,
      calendar: input.calendar, gender: input.gender,
      saju_raw: engine.saju_raw, saju_json: engine.saju_json, schema_version: 1,
    })
    .select("id").single();
  if (error) console.error("saju_profiles insert error:", error);
  return data?.id ?? null;
}

/** 1회성 캐시 조회. 테이블이 없거나 조회 실패면 null(생성으로 진행). */
export async function readAdhocCache<T>(
  userId: string, productId: string, input: TargetInput, variant = ""
): Promise<T | null> {
  try {
    const { data } = await supabaseAdmin
      .from("premium_adhoc_reports").select("content")
      .eq("user_id", userId).eq("product_id", productId)
      .eq("birth_date", input.birthDate).eq("birth_time", timeKeyOf(input.birthTime))
      .eq("gender", input.gender).eq("variant", variant)
      .or(notExpiredFilter()).limit(1).maybeSingle();
    return (data?.content as T) ?? null;
  } catch {
    return null;
  }
}

/** 1회성 캐시 저장. 캐시일 뿐이므로 실패해도 응답은 정상 반환한다. */
export async function writeAdhocCache(
  userId: string, productId: string, input: TargetInput, content: unknown, variant = ""
): Promise<void> {
  try {
    await supabaseAdmin.from("premium_adhoc_reports").upsert(
      {
        user_id: userId, product_id: productId,
        birth_date: input.birthDate, birth_time: timeKeyOf(input.birthTime),
        gender: input.gender, variant, content, expires_at: reportExpiresAtIso(),
      },
      { onConflict: "user_id,product_id,birth_date,birth_time,gender,variant" }
    );
  } catch { /* noop */ }
}

/**
 * 본인 사주 캐시에 쓸 saju_profile_id를 확보한다.
 *  - 이미 등록된 사주가 있으면 그 id
 *  - 없으면 이 입력을 본인 프로필로 저장하고(016 규칙) 새 id
 * 저장에 실패하면 null — 호출부는 캐시 저장만 건너뛰고 리포트는 정상 반환해야 한다.
 *
 * 프로필 저장에는 엔진의 saju_raw/saju_json이 필요해 runSajuEngine을 한 번 더 부른다.
 * 결정론적 계산이라 LLM 비용·지연이 없고, 이 경로는 "첫 등록" 1회뿐이다.
 * (엔진은 읽기 전용으로만 쓴다 — 계산 로직 무접촉)
 */
export async function ensureOwnProfileId(
  userId: string, input: TargetInput, ownProfile: OwnProfile | null
): Promise<string | null> {
  if (ownProfile?.id) return ownProfile.id;
  try {
    const engine = runSajuEngine({
      birth_date: input.birthDate, birth_time: input.birthTime,
      calendar: input.calendar, gender: input.gender,
    });
    return await saveAsOwnProfile(userId, input, engine);
  } catch (e) {
    console.error("ensureOwnProfileId 실패:", e);
    return null;
  }
}

/** 1회성 대상 사주를 담는 프로필의 label. "본인"이 아니어야 한다 — 앱 전역이
 *  label="본인"으로만 조회하므로, 이 행은 어떤 화면·API에도 잡히지 않는다. */
export const TARGET_PROFILE_LABEL = "대상";

/**
 * **어떤 대상이든** saju_profile_id를 확보한다(운명 설계도 전용).
 *
 * 운명 설계도는 다른 리포트와 달리 재개 가능한 다단계 생성기라, 진행 상태
 * (status/parts_done/attempt_id/pass_id)를 blueprint_reports에 들고 있고 그 키가
 * saju_profile_id다. 1회성 캐시 테이블에는 이 상태 컬럼들이 없어서 그쪽으로는
 * 옮길 수 없다. 7,900원짜리 상품의 살아 있는 테이블 PK를 바꾸는 건 위험이 커,
 * **대상마다 label="대상" 프로필 행을 하나 두고** 상태 머신은 그대로 둔다.
 *
 * - 본인 사주면 기존 본인 행(없으면 016 규칙대로 새로 저장)
 * - 그 외에는 같은 생년월일시·성별의 "대상" 행을 재사용하고, 없으면 만든다
 *   (재사용해야 탭을 닫았다 다시 열었을 때 만들던 리포트를 이어받는다)
 */
export async function ensureTargetProfileId(
  userId: string, input: TargetInput, ownProfile: OwnProfile | null, isAdhoc: boolean
): Promise<string | null> {
  if (!isAdhoc) return ensureOwnProfileId(userId, input, ownProfile);

  const { data: existing } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("label", TARGET_PROFILE_LABEL)
    .eq("birth_date", input.birthDate).eq("gender", input.gender)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) return existing.id;

  try {
    const engine = runSajuEngine({
      birth_date: input.birthDate, birth_time: input.birthTime,
      calendar: input.calendar, gender: input.gender,
    });
    const { data, error } = await supabaseAdmin
      .from("saju_profiles")
      .insert({
        user_id: userId, label: TARGET_PROFILE_LABEL,
        birth_date: input.birthDate, birth_time: input.birthTime,
        calendar: input.calendar, gender: input.gender,
        saju_raw: engine.saju_raw, saju_json: engine.saju_json, schema_version: 1,
      })
      .select("id").single();
    if (error) console.error("대상 프로필 insert 실패:", error);
    return data?.id ?? null;
  } catch (e) {
    console.error("ensureTargetProfileId 실패:", e);
    return null;
  }
}
