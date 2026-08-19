"use client";

import { useEffect, useRef, useState } from "react";

const COUNTDOWN_SECONDS = 5;

const ADFIT_UNITS = {
  saju: process.env.NEXT_PUBLIC_ADFIT_UNIT_FREE_SAJU ?? "",
  compatibility: process.env.NEXT_PUBLIC_ADFIT_UNIT_FREE_COMPATIBILITY ?? "",
  taekil: process.env.NEXT_PUBLIC_ADFIT_UNIT_FREE_TAEKIL ?? "",
  yearly: process.env.NEXT_PUBLIC_ADFIT_UNIT_FREE_YEARLY ?? "",
} as const;

type FreePage = keyof typeof ADFIT_UNITS;

/**
 * 광고 시청 게이트.
 * 1) /api/ads/token 으로 1회용 토큰 발급
 * 2) 카카오 애드핏 300x250 광고(유닛 설정 시) 또는 플레이스홀더 노출 + 카운트다운
 * 3) 카운트다운 종료 시 onComplete(token) 호출 → 호출부가 무료 리포트 API 요청
 */
export function AdGate({ onComplete, page }: { onComplete: (token: string) => void; page: FreePage }) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [token, setToken] = useState<string | null>(null);
  const firedRef = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const adUnit = ADFIT_UNITS[page];

  // 토큰 발급
  useEffect(() => {
    fetch("/api/ads/token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? ""))
      .catch(() => setToken("")); // 실패해도 플로우 진행(검증 단계에서 막힘)
  }, []);

  // 애드핏 스크립트 로드 — 마운트마다 새로 붙여 재스캔 유도(SPA 네비게이션 대응)
  useEffect(() => {
    if (!adUnit) return;
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    insRef.current?.parentElement?.appendChild(script);
    return () => {
      script.remove();
    };
  }, [adUnit]);

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
    <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center gap-7 bg-[#0E2521] px-6 py-16">
      <div className="flex flex-col items-center gap-2">
        <p className="text-white/80 text-sm">광고 시청 중... {remaining > 0 ? `${remaining}초` : "완료"}</p>
        <p className="text-white/80 text-sm text-center leading-relaxed">
          광고를 클릭해도 결과 페이지는 그대로 유지됩니다.
          <br />
          새 창에서 확인 후 언제든 다시 돌아올 수 있어요.
        </p>
      </div>

      {/* 광고 영역 (300x250) */}
      <div className="w-[300px] h-[250px] bg-[#16302B] border border-[#2A4742] rounded-2xl flex items-center justify-center overflow-hidden">
        {adUnit ? (
          <ins
            ref={insRef}
            className="kakao_ad_area"
            style={{ display: "block", width: 300, height: 250 }}
            data-ad-unit={adUnit}
            data-ad-width="300"
            data-ad-height="250"
          />
        ) : (
          <div className="text-center text-white/40 text-sm px-6">
            <div className="text-4xl mb-2">📺</div>
            광고 영역
            <div className="text-[11px] mt-1 text-white/25">(애드핏 유닛 설정 후 실제 광고 노출)</div>
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
