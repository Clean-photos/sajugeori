import type { AdRewardProvider } from "./types";

// Dev-only: always returns true. Replace with real SDK in production.
export class MockAdReward implements AdRewardProvider {
  async verify(): Promise<boolean> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MockAdReward must not be used in production");
    }
    return true;
  }
}
