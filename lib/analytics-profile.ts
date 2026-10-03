"use client";

/**
 * GA4 리포트 이벤트용 "누구 사주였나" 구분값(9차 G-5, CoS 예약 → 다중 사주 배포 후 착수).
 *
 *  - profile_relation: "self"(본인) | "other"(다른 사람) | "pet"(펫)
 *  - profile_index: 등록 프로필 중 순번(1=본인, 2~=추가한 순서). 등록 안 된 일회성 입력은 0, 펫은 0.
 *
 * 이름·생년월일 등 식별 정보는 이벤트로 보내지 않는다 — 순번과 관계 구분만 남긴다.
 * 조회 실패·비로그인 등 어떤 경우에도 {}를 돌려줘 이벤트 자체는 그대로 나간다.
 */
export type ProfileMeta = { profile_relation?: "self" | "other" | "pet"; profile_index?: number };

interface Row {
  label: string; kind: string; is_primary: boolean;
  birth_date: string; birth_time: string | null; gender: string; created_at: string;
}

const timeKey = (t: unknown) => (typeof t === "string" && t ? t.slice(0, 5) : "");
let lastMeta: { product: string; meta: ProfileMeta } | null = null;

export async function resolveProfileMeta(product: string, body?: unknown): Promise<ProfileMeta> {
  try {
    if (product === "pet") return remember(product, { profile_relation: "pet", profile_index: 0 });
    const res = await fetch("/api/profiles");
    if (!res.ok) return {};
    const rows = ((await res.json()).profiles ?? []) as Row[];
    const people = rows.filter((r) => r.kind === "person");
    const primary = people.find((r) => r.is_primary);
    const named = people
      .filter((r) => !r.is_primary && r.label !== "대상")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const registered = primary ? [primary, ...named] : named;

    // 본문이 없는 요청(GET)은 등록된 본인 기준이다.
    const b = (body ?? null) as Record<string, unknown> | null;
    if (!b || typeof b.birth_date !== "string") {
      return remember(product, primary ? { profile_relation: "self", profile_index: 1 } : {});
    }
    const idx = registered.findIndex(
      (r) => r.birth_date === b.birth_date && timeKey(r.birth_time) === timeKey(b.birth_time) && r.gender === b.gender
    );
    if (idx < 0) return remember(product, { profile_relation: "other", profile_index: 0 });
    return remember(product, {
      profile_relation: registered[idx].is_primary ? "self" : "other",
      profile_index: idx + 1,
    });
  } catch {
    return {};
  }
}

function remember(product: string, meta: ProfileMeta): ProfileMeta {
  lastMeta = { product, meta };
  return meta;
}

/** 같은 화면에서 방금 생성한 상품의 구분값. 저장본을 새로 연 경우엔 없다(오귀속 방지로 비움). */
export function recentProfileMeta(product: string): ProfileMeta {
  return lastMeta && lastMeta.product === product ? lastMeta.meta : {};
}
