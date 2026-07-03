// 프리미엄 플랜 정의 — 단건 결제 후 일정 기간 프리미엄 부여 모델.
// 실DB subscriptions: status/plan/expires_at 기반 (billing key 미사용).

export interface Plan {
  id: string;
  name: string;
  amount: number; // KRW
  days: number;   // 결제 후 부여 기간(일)
}

export const PREMIUM_MONTHLY: Plan = {
  id: "premium_monthly",
  name: "Captique 프리미엄 (30일)",
  amount: 9900,
  days: 30,
};

export const PLANS: Record<string, Plan> = {
  [PREMIUM_MONTHLY.id]: PREMIUM_MONTHLY,
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}
