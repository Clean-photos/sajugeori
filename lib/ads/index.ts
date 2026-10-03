import type { AdRewardProvider } from "./types";

export function getAdRewardProvider(): AdRewardProvider {
  // AD_PROVIDER=mock일 때만 mock(무조건 통과). 그 외엔 DB 1회용 토큰 검증(dev·prod 공통).
  if (process.env.AD_PROVIDER === "mock") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 사용하는 구현만 지연 로드
    const { MockAdReward } = require("./mock");
    return new MockAdReward();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 사용하는 구현만 지연 로드
  const { DbAdReward } = require("./db");
  return new DbAdReward();
}

export type { AdRewardProvider };
