import Link from "next/link";

const LINKS = [
  { href: "/about", label: "서비스 소개" },
  { href: "/guide", label: "읽을거리" },
  { href: "/contact", label: "문의하기" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];

/** 사이트 공통 푸터. 신뢰도 링크 + 오락·참고용 면책 고지(YMYL 대응). */
export function SiteFooter() {
  return (
    <footer className="mt-10 px-6 pt-7 pb-8 border-t border-[#E5DFD4] bg-[#F1EADC]">
      <p className="font-serif text-base font-bold text-[#1F3D34]">사주거리</p>
      <p className="text-xs text-[#6B6661] mt-1 leading-relaxed">
        AI 기술과 전통 명리학 해석을 결합한 사주·운세 서비스
      </p>

      <nav className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-xs text-[#6B6661] underline underline-offset-2 active:opacity-60">
            {l.label}
          </Link>
        ))}
      </nav>

      <p className="text-[11px] text-[#6B6661]/70 leading-relaxed mt-5">
        본 서비스가 제공하는 사주·운세 콘텐츠는 오락 및 참고 목적으로만 제공되며,
        법률·의료·정신건강·재정·투자 등 어떠한 전문적 자문도 대체하지 않습니다.
        중요한 결정은 해당 분야 전문가와 상담하시기 바랍니다.
      </p>
      <p className="text-[11px] text-[#6B6661]/50 mt-3">
        © {new Date().getFullYear()} 사주거리 (sajugeori.com)
      </p>
    </footer>
  );
}
