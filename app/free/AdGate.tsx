"use client";

import { useEffect, useRef, useState } from "react";
import { scheduleKakaoAdfitLoad } from "@/lib/ads/kakaoAdfitLoader";

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
 * 1) /api/ads/token 으로 1회용 토큰 발급 → 발급 즉시 onComplete(token) 호출해 리포트 생성을
 *    광고 시청과 병렬로 시작한다(최소 시청 시간 동안 이미 결과가 준비되면 대기 없이 바로 전환됨).
 * 2) 카카오 애드핏 300x250 광고(유닛 설정 시) 또는 플레이스홀더 노출 + 최소 시청 카운트다운
 * 3) 카운트다운(5초) 종료 후에도 결과가 아직 준비되지 않았으면 닫기 버튼을 노출한다.
 *    닫기를 누르면 onSkip()으로 화면만 전환하고, 이미 시작된 리포트 생성은 백그라운드에서 계속된다.
 */
export function AdGate({
  onComplete,
  onSkip,
  page,
}: {
  onComplete: (token: string) => void;
  onSkip: () => void;
  page: FreePage;
}) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [token, setToken] = useState<string | null>(null);
  const firedRef = useRef(false);
  const adUnit = ADFIT_UNITS[page];

  // 토큰 발급
  useEffect(() => {
    fetch("/api/ads/token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? ""))
      .catch(() => setToken("")); // 실패해도 플로우 진행(검증 단계에서 막힘)
  }, []);

  // 애드핏 스크립트 로드 — 마운트마다 재로드 예약(SPA 네비게이션 대응).
  // 실제 script 태그 삽입은 kakaoAdfitLoader가 한 번으로 묶는다(§5, 홈의
  // 배너 3개가 동시에 스크립트를 따로 실행하며 광고 요청이 겹치던 문제와
  // 같은 원인 — 여기는 화면당 광고 1개뿐이지만 로더를 통일해 둔다).
  useEffect(() => {
    if (!adUnit) return;
    scheduleKakaoAdfitLoad();
  }, [adUnit]);

  // 최소 시청 카운트다운 (표시용 — 결과 생성 시작을 막지 않는다)
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  // 토큰이 준비되는 즉시 리포트 생성 시작 — 광고 시청과 병렬 진행
  useEffect(() => {
    if (token !== null && !firedRef.current) {
      firedRef.current = true;
      onComplete(token);
    }
  }, [token, onComplete]);

  const progress = ((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center gap-7 bg-[#0E2521] px-6 py-16">
      {remaining <= 0 && (
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 text-white/70 text-sm border border-white/30 rounded-full px-3.5 py-1.5"
        >
          닫기 ✕
        </button>
      )}

      <div className="flex flex-col items-center gap-2">
        <p className="text-white/80 text-sm">광고 시청 중... {remaining > 0 ? `${remaining}초` : "결과 준비 중"}</p>
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
