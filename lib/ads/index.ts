import type { AdRewardProvider } from "./types";

export function getAdRewardProvider(): AdRewardProvider {
  // AD_PROVIDER=mock일 때만 mock(무조건 통과). 그 외엔 DB 1회용 토큰 검증(dev·prod 공통).
  if (process.env.AD_PROVIDER === "mock") {
    const { MockAdReward } = require("./mock");
    return new MockAdReward();
  }
  const { DbAdReward } = require("./db");
  return new DbAdReward();
}

export type { AdRewardProvider };
