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

export const SALPURI_ONE: Plan = {
  id: "salpuri_one",
  name: "프리미엄 살풀이 1회",
  amount: 990,
  kind: "one_time",
  days: 0,
};

export const PLANS: Record<string, Plan> = {
  [PREMIUM_MONTHLY.id]: PREMIUM_MONTHLY,
  [SALPURI_ONE.id]: SALPURI_ONE,
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}
