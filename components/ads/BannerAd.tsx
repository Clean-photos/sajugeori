"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const HOME_BANNER_SLOT = process.env.NEXT_PUBLIC_ADSENSE_HOME_BANNER_SLOT ?? "";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 홈 화면 무료 콘텐츠 그리드와 사주거리 섹션 사이의 가로형 배너 광고.
 *
 * 슬롯이 없으면 아무것도 렌더하지 않는다. 이전에는 "광고 영역 (AdSense 승인 후 노출)"
 * 이라는 안내가 담긴 점선 박스를 띄웠는데, 그 문구가 그대로 SSR HTML에 실려
 * 심사 크롤러에게 미완성 사이트로 보였다. 자리 표시는 개발 편의일 뿐이라 제거.
 */
export function BannerAd() {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT || !HOME_BANNER_SLOT || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      /* noop */
    }
  }, []);

  if (!ADSENSE_CLIENT || !HOME_BANNER_SLOT) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={HOME_BANNER_SLOT}
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
}
