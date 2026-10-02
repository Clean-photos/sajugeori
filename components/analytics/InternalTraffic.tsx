"use client";

import { useEffect } from "react";

const KEY = "sj_qa";

/**
 * QA·CEO 계정으로 로그인한 브라우저를 GA4에서 내부 트래픽으로 표시한다(9차 G-1).
 * `?qa=1`로 켜고 `?qa=0`으로 끄는 수동 표시는 app/layout.tsx의 인라인 GA 스크립트가 첫 hit부터
 * 처리한다. 이 컴포넌트는 그 위에 "내부 계정 로그인"을 자동 감지해 같은 localStorage 표시를 남긴다 —
 * 이후 방문은 인라인 스크립트가 첫 hit부터 traffic_type을 싣는다(이번 방문은 set으로 즉시 반영).
 */
export function InternalTraffic() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
    } catch {
      return;
    }
    let cancelled = false;
    fetch("/api/internal-traffic", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.internal) return;
        try { window.localStorage.setItem(KEY, "1"); } catch { /* 저장 실패해도 이번 방문엔 표시 */ }
        window.gtag?.("set", { traffic_type: "internal" });
      })
      .catch(() => { /* 계측 보조 기능 — 실패해도 앱 동작과 무관 */ });
    return () => { cancelled = true; };
  }, []);
  return null;
}
