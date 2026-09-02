"use client";

import { useEffect, useRef } from "react";

/**
 * 카카오 애드핏 배너. 규격(width/height)과 광고 단위를 호출부에서 정한다.
 *
 * 애드핏 스크립트는 로드 시점에 DOM에 있는 .kakao_ad_area만 스캔하고 이후
 * SPA 네비게이션은 감지하지 못한다. 그래서 마운트될 때마다 스크립트 태그를
 * 새로 붙여 재스캔을 유도한다.
 *
 * 광고 단위가 비어 있으면 아무것도 그리지 않는다 — 빈 자리가 남는 것보다
 * 레이아웃이 자연스럽게 붙는 편이 낫고, 구좌 발급 전에도 배포가 가능해진다.
 * (애드핏 광고 단위는 매체별로 발급된다. 다른 사이트 구좌를 가져다 쓰면
 *  정책 위반이 될 수 있으므로 이 사이트용으로 발급받은 값만 넣는다.)
 */
export function KakaoAdFitBanner({
  unit,
  width = 320,
  height = 100,
}: {
  unit: string;
  width?: number;
  height?: number;
}) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!unit) return;
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    insRef.current?.parentElement?.appendChild(script);
    return () => {
      script.remove();
    };
  }, [unit]);

  if (!unit) return null;

  return (
    <ins
      ref={insRef}
      className="kakao_ad_area"
      style={{ display: "block", width, height, margin: "0 auto" }}
      data-ad-unit={unit}
      data-ad-width={String(width)}
      data-ad-height={String(height)}
    />
  );
}
