// 프리미엄 상품 정의.
// - subscription: 단건 결제 후 일정 기간 프리미엄 부여 (subscriptions 테이블)
// - one_time: 특정 기능 1회 이용권 (one_time_purchases 테이블, used_at으로 소진 관리)

export interface Plan {
  id: string;
  name: string;
  amount: number; // KRW
  kind: "subscription" | "one_time";
  days: number;   // subscription: 부여 기간(일) / one_time: 0
}

export const PREMIUM_MONTHLY: Plan = {
  id: "premium_monthly",
  name: "사주거리 프리미엄 (30일)",
  amount: 5900,
  kind: "subscription",
  days: 30,
};

/**
 * 프리미엄 리포트 6종. 각각 990원 단건 이용권으로 판매한다.
 *
 * 사주는 한 번 보면 끝나는 소비라 월 구독과 궁합이 나쁘다. 반면 궁합·반려동물·
 * 택일·연운세는 대상이나 시기가 바뀌면 다시 볼 이유가 생기므로 단건이 맞다.
 * productId는 one_time_purchases.product_id에 그대로 저장된다.
 */
export const REPORT_PRODUCTS = [
  { key: "saju", productId: "saju_one", label: "프리미엄 사주", path: "/premium" },
  { key: "compatibility", productId: "compatibility_one", label: "프리미엄 궁합", path: "/premium/compatibility" },
  { key: "pet", productId: "pet_one", label: "반려동물 궁합", path: "/premium/pet" },
  { key: "taekil", productId: "taekil_one", label: "프리미엄 택일", path: "/premium/taekil" },
  { key: "yearly", productId: "yearly_one", label: "프리미엄 연운세", path: "/premium/yearly" },
  { key: "salpuri", productId: "salpuri_one", label: "프리미엄 살풀이", path: "/premium/salpuri" },
] as const;

export const ONE_REPORT_PRICE = 990;

/** 단건 이용권 6종 */
const ONE_TIME_PLANS: Plan[] = REPORT_PRODUCTS.map((p) => ({
  id: p.productId,
  name: `${p.label} 1회`,
  amount: ONE_REPORT_PRICE,
  kind: "one_time" as const,
  days: 0,
}));

/** 살풀이 단건 — 기존 코드 호환용 별칭 */
export const SALPURI_ONE = ONE_TIME_PLANS.find((p) => p.id === "salpuri_one")!;

/**
 * 묶음권. 990원 단품만으로는 객단가가 낮아, 개당 단가를 낮춘 묶음으로 유도한다.
 *
 * 2,900원은 단품 3개(2,970원) 대비 70원 차이뿐이라 유인이 약했다. 2,700원으로 두면
 * 개당 900원으로 떨어져 "묶으면 싸다"가 한눈에 읽힌다. 결제가 한 번에 끝나므로
 * PG 수수료도 세 번 나눠 낼 때보다 적다.
 */
export const BUNDLE_3: Plan = {
  id: "bundle_3",
  name: "리포트 3종 선택권",
  amount: 2700,
  kind: "one_time",
  days: 0,
};

export const BUNDLE_ALL: Plan = {
  id: "bundle_all",
  name: "리포트 전체 열람권 (6종)",
  amount: 4900,
  kind: "one_time",
  days: 0,
};

/** 묶음권이 부여하는 이용권 장수 */
export const BUNDLE_CREDITS: Record<string, number> = {
  [BUNDLE_3.id]: 3,
  [BUNDLE_ALL.id]: REPORT_PRODUCTS.length,
};

export const PLANS: Record<string, Plan> = {
  [PREMIUM_MONTHLY.id]: PREMIUM_MONTHLY,
  [BUNDLE_3.id]: BUNDLE_3,
  [BUNDLE_ALL.id]: BUNDLE_ALL,
  ...Object.fromEntries(ONE_TIME_PLANS.map((p) => [p.id, p])),
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}
