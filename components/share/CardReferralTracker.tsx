"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * 결과 카드 공유 링크(utm_source=card)로 들어온 방문을 GA4 이벤트로 남긴다 — card_referral_visit.
 * GA4 기본 세션 소스(card / referral)와 별개로, 카드 유입 자체를 전환 지표로 볼 수 있게 한다.
 * 세션당 1회만 보낸다(같은 탭에서 페이지를 옮겨도 다시 세지 않는다).
 */
export function CardReferralTracker() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("utm_source") !== "card") return;
      if (sessionStorage.getItem("card_referral_tracked")) return;
      sessionStorage.setItem("card_referral_tracked", "1");
      trackEvent("card_referral_visit", { campaign: q.get("utm_campaign") ?? "" });
    } catch {
      /* sessionStorage 차단 등 — 계측만 건너뛴다 */
    }
  }, []);
  return null;
}
