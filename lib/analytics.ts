"use client";

/**
 * GA4 커스텀 이벤트 공용 헬퍼.
 *
 * CoS 실물 확인(2026-09-16): GA4에 이벤트는 쌓이는데(활성 133명·세션 397·
 * 이벤트 4,223) 전환으로 잡힌 게 하나도 없었다 — 커스텀 이벤트를 어디서도
 * 안 보내고 있었기 때문(코드 전수 검색 결과 gtag('event', ...) 호출 0건).
 * 특히 purchase가 없어 총수익이 항상 ₩0으로 잡혔다.
 *
 * window.gtag는 app/layout.tsx의 인라인 GA4 스크립트가 로드된 뒤에만 존재한다
 * (광고 차단기로 스크립트 자체가 아예 안 실렸을 수도 있다) — 항상 존재 여부를
 * 확인하고, 실패해도 앱 동작에 영향이 없도록 조용히 무시한다.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    /* 계측 실패가 실제 기능을 막아서는 안 된다 */
  }
}
