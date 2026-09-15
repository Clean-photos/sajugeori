"use client";

import Link from "next/link";

const ALL_FREE_LINKS = [
  { href: "/free/saju", label: "무료 사주" },
  { href: "/free/compatibility", label: "무료 궁합" },
  { href: "/free/taekil", label: "무료 택일" },
  { href: "/free/yearly", label: "무료 연운세" },
] as const;

/**
 * §2-4(CoS 실물 재검증, 2026-09-13): 무료 결과를 다 읽은 뒤 다른 무료 메뉴로
 * 가거나 홈으로 돌아갈 경로가 상단에 없어, 하단까지 스크롤해야 "다시
 * 조회하기"가 나왔다 — 무료 4종 간 회유는 광고 게이트를 다시 거치므로
 * 리워드 광고 노출로 직결되는데, 그 회유 경로 자체가 눈에 안 띄었다.
 * 결과 화면 맨 위(다크 헤더 바로 아래)에 "← 홈"과 나머지 3개 무료 풀이로
 * 가는 링크를 둔다. current로 지금 보고 있는 페이지는 제외한다.
 */
export function FreeResultNav({ current }: { current: (typeof ALL_FREE_LINKS)[number]["href"] }) {
  const others = ALL_FREE_LINKS.filter((l) => l.href !== current);
  return (
    <div className="px-5 pt-3 pb-1 flex items-center justify-between gap-2 flex-wrap">
      <Link href="/" className="text-xs text-[#6B6661] flex items-center gap-1 active:opacity-60">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        홈
      </Link>
      <div className="flex gap-1.5 flex-wrap justify-end">
        {others.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[11px] text-[#C8743A] border border-[#C8743A]/30 rounded-full px-2.5 py-1 whitespace-nowrap active:scale-[0.96] transition-all"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
