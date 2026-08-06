"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "홈",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: "/onboarding",
    label: "사주추가",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/premium/menu",
    label: "프리미엄",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    // AI 역술가 대화(/street)는 품질이 기대에 못 미쳐 진입점을 내렸다.
    // 코드와 라우트는 그대로 두어 나중에 되살릴 수 있게 한다.
    // 그 자리에는 읽을거리를 둔다. 콘텐츠를 읽다 궁금해져 리포트로 넘어가는
    // 흐름이 단건 판매와 잘 맞는다.
    href: "/guide",
    label: "읽을거리",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    href: "/mypage",
    label: "보관함",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function BottomTabBar({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname();

  const activeColor = dark ? "#F6F1E7" : "#1F3D34";
  const inactiveColor = dark ? "#8FA39C" : "#6B6661";

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
      {/* Blur backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-md border-t ${
          dark ? "bg-[#0E2521]/90 border-[#2A4742]" : "bg-white/90 border-[#E5DFD4]"
        }`}
      />
      <div className="relative flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center pt-2.5 pb-3 gap-1"
            >
              <span
                className="transition-all duration-200"
                style={{ color: active ? activeColor : inactiveColor, transform: active ? "scale(1.1)" : undefined }}
              >
                {tab.icon}
              </span>
              <span
                className="text-[10px] font-medium tracking-tight transition-colors"
                style={{ color: active ? activeColor : inactiveColor }}
              >
                {tab.label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ bottom: 2, backgroundColor: activeColor }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
