"use client";

import { useEffect, useRef } from "react";

const AD_UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT_HOME_BANNER ?? "";

/**
 * 카카오 애드핏 320x100 배너.
 * 애드핏 스크립트는 로드 시점에 DOM에 있는 .kakao_ad_area만 스캔하고 이후
 * SPA 네비게이션은 감지하지 못한다. 그래서 마운트될 때마다 스크립트 태그를
 * 새로 붙여 재스캔을 유도한다.
 */
export function KakaoAdFitBanner() {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!AD_UNIT) return;
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    insRef.current?.parentElement?.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  if (!AD_UNIT) return null;

  return (
    <ins
      ref={insRef}
      className="kakao_ad_area"
      style={{ display: "block", width: 320, height: 100, margin: "0 auto" }}
      data-ad-unit={AD_UNIT}
      data-ad-width="320"
      data-ad-height="100"
    />
  );
}
