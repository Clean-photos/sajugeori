"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const HOME_BANNER_SLOT = process.env.NEXT_PUBLIC_ADSENSE_HOME_BANNER_SLOT ?? "";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** 홈 화면 무료 콘텐츠 그리드와 사주거리 섹션 사이의 가로형 배너 광고. 슬롯 미설정 시 플레이스홀더. */
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

  if (!ADSENSE_CLIENT || !HOME_BANNER_SLOT) {
    return (
      <div className="w-full h-[100px] rounded-xl bg-[#FBF8F2] border border-dashed border-[#E5DFD4] flex items-center justify-center">
        <p className="text-[11px] text-[#6B6661]/60">광고 영역 (AdSense 승인 후 노출)</p>
      </div>
    );
  }

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
