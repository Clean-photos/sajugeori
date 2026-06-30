import type { AdRewardProvider } from "./types";

export function getAdRewardProvider(): AdRewardProvider {
  if (process.env.AD_PROVIDER === "mock" || process.env.NODE_ENV !== "production") {
    const { MockAdReward } = require("./mock");
    return new MockAdReward();
  }
  // TODO: swap in real AdSense rewarded provider
  throw new Error("Production ad reward provider not configured");
}

export type { AdRewardProvider };
