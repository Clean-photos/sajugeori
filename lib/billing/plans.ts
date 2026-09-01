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
 * 프리미엄 리포트 7종. 각각 990원 단건 이용권으로 판매한다.
 *
 * 사주는 한 번 보면 끝나는 소비라 월 구독과 궁합이 나쁘다. 반면 궁합·반려동물·
 * 택일·연운세·오행 보완은 대상이나 시기가 바뀌면 다시 볼 이유가 생기므로 단건이 맞다.
 * productId는 one_time_purchases.product_id에 그대로 저장된다.
 *
 * bundleEligible: false면 BUNDLE_ALL(전체 열람권) 산정에서 빠진다. 오행 보완은
 * 여기서 빠진다(§10-9 결정③, D47) — 묶음권 자체가 이미 폐지 결정된 상품(판매
 * 실적 0, 진입점만 막아 둔 상태)이라 "6종" 이름·가격을 그대로 둔다. 묶음권을
 * 실제로 정리할 때(BUNDLE_ALL·BUNDLE_CREDITS 자체를 없앨 때) 함께 처리한다.
 */
export const REPORT_PRODUCTS = [
  { key: "saju", productId: "saju_one", label: "프리미엄 사주", path: "/premium", bundleEligible: true },
  { key: "compatibility", productId: "compatibility_one", label: "프리미엄 궁합", path: "/premium/compatibility", bundleEligible: true },
  { key: "pet", productId: "pet_one", label: "반려동물 궁합", path: "/premium/pet", bundleEligible: true },
  { key: "taekil", productId: "taekil_one", label: "프리미엄 택일", path: "/premium/taekil", bundleEligible: true },
  { key: "yearly", productId: "yearly_one", label: "프리미엄 연운세", path: "/premium/yearly", bundleEligible: true },
  { key: "salpuri", productId: "salpuri_one", label: "프리미엄 살풀이", path: "/premium/salpuri", bundleEligible: true },
  { key: "wuxing", productId: "wuxing_one", label: "오행 보완 리포트", path: "/premium/wuxing", bundleEligible: false },
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

/** 묶음권이 부여하는 이용권 장수. BUNDLE_ALL은 bundleEligible 상품만 센다(§10-9 결정③) */
export const BUNDLE_CREDITS: Record<string, number> = {
  [BUNDLE_3.id]: 3,
  [BUNDLE_ALL.id]: REPORT_PRODUCTS.filter((p) => p.bundleEligible).length,
};

/**
 * 운명 설계도 — 프리미엄 사주(990원)의 확장판. 직접 사면 7,900원, 이미 프리미엄
 * 사주를 본 사람은 차액 6,900원으로 업그레이드한다(990+6,900=7,890 ≈ 7,900,
 * 어느 경로로 와도 총액이 사실상 같도록 설계). 두 플랜 모두 결제 승인 로직은
 * 기존 one_time과 동일하게 타되, 업그레이드가는 자격이 있는 사람만 결제할 수
 * 있도록 /premium/buy 서버 컴포넌트에서 사전 검증한다(lib/billing/access.ts
 * 참고). 별도 만료 타이머는 두지 않고, 열람 자체는 다른 리포트와 같은 1년
 * 캐시 수명을 따른다.
 */
export const DESTINY_BLUEPRINT_ONE: Plan = {
  id: "destiny_blueprint_one",
  name: "운명 설계도",
  amount: 7900,
  kind: "one_time",
  days: 0,
};

export const DESTINY_UPGRADE: Plan = {
  id: "destiny_upgrade",
  name: "운명 설계도 업그레이드",
  amount: 6900,
  kind: "one_time",
  days: 0,
};

/** 운명 설계도 열람 자격을 주는 상품 id들. 이 중 무엇으로 결제했든 동일하게 열람 가능. */
export const DESTINY_PRODUCT_IDS = [DESTINY_BLUEPRINT_ONE.id, DESTINY_UPGRADE.id];

export const PLANS: Record<string, Plan> = {
  [PREMIUM_MONTHLY.id]: PREMIUM_MONTHLY,
  [BUNDLE_3.id]: BUNDLE_3,
  [BUNDLE_ALL.id]: BUNDLE_ALL,
  [DESTINY_BLUEPRINT_ONE.id]: DESTINY_BLUEPRINT_ONE,
  [DESTINY_UPGRADE.id]: DESTINY_UPGRADE,
  ...Object.fromEntries(ONE_TIME_PLANS.map((p) => [p.id, p])),
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}
