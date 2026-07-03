"use client";

import { useEffect, useRef, useState } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "";
const COUNTDOWN_SECONDS = 5;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 광고 시청 게이트.
 * 1) /api/ads/token 으로 1회용 토큰 발급
 * 2) AdSense 광고(키 설정 시) 또는 플레이스홀더 노출 + 카운트다운
 * 3) 카운트다운 종료 시 onComplete(token) 호출 → 호출부가 무료 리포트 API 요청
 */
export function AdGate({ onComplete }: { onComplete: (token: string) => void }) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [token, setToken] = useState<string | null>(null);
  const firedRef = useRef(false);
  const adPushedRef = useRef(false);

  // 토큰 발급
  useEffect(() => {
    fetch("/api/ads/token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? ""))
      .catch(() => setToken("")); // 실패해도 플로우 진행(검증 단계에서 막힘)
  }, []);

  // AdSense 스크립트 로드 + 광고 push
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    const id = "adsbygoogle-js";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(s);
    }
    const t = setTimeout(() => {
      if (adPushedRef.current) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adPushedRef.current = true;
      } catch { /* noop */ }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // 카운트다운
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  // 종료 조건: 카운트다운 0 + 토큰 준비됨
  useEffect(() => {
    if (remaining <= 0 && token !== null && !firedRef.current) {
      firedRef.current = true;
      onComplete(token);
    }
  }, [remaining, token, onComplete]);

  const progress = ((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0E2521] px-6">
      <p className="text-white/80 text-sm">광고 시청 중... {remaining > 0 ? `${remaining}초` : "완료"}</p>

      {/* 광고 영역 */}
      <div className="w-full max-w-sm min-h-[250px] bg-[#16302B] border border-[#2A4742] rounded-2xl flex items-center justify-center overflow-hidden">
        {ADSENSE_CLIENT ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: 250 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="text-center text-white/40 text-sm px-6">
            <div className="text-4xl mb-2">📺</div>
            광고 영역
            <div className="text-[11px] mt-1 text-white/25">(AdSense 승인 후 실제 광고 노출)</div>
          </div>
        )}
      </div>

      {/* 진행 바 */}
      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#C8743A] rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-white/40 text-xs">잠시만 기다리면 결과가 나와요</p>
    </div>
  );
}
