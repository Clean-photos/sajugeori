import type { AdRewardProvider } from "./types";
import { supabaseAdmin } from "@/lib/db/client";

// 1회용 토큰 검증 provider.
// /api/ads/token이 발급한 미사용 토큰이면 통과시키고 즉시 used=true로 소비한다(재사용 차단).
export class DbAdReward implements AdRewardProvider {
  async verify(adToken: string, _userKey: string): Promise<boolean> {
    if (!adToken) return false;

    const { data, error } = await supabaseAdmin
      .from("ad_tokens")
      .select("token, used")
      .eq("token", adToken)
      .limit(1)
      .maybeSingle();

    if (error || !data || data.used) return false;

    // 소비 처리 (동시요청 대비 used=false 조건부 업데이트)
    const { data: consumed } = await supabaseAdmin
      .from("ad_tokens")
      .update({ used: true })
      .eq("token", adToken)
      .eq("used", false)
      .select("token");

    return !!(consumed && consumed.length > 0);
  }
}
