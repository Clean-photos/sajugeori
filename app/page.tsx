import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { BannerAd } from "@/components/ads/BannerAd";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ARTICLES } from "./guide/articles";
import { TERMS } from "./dictionary/terms";
import { HeaderAuth } from "./HeaderAuth";

const MENU_CARDS = [
  {
    href: "/free/saju",
    icon: "☯",
    title: "무료 일반사주",
    subtitle: "팔자와 운명의 흐름",
    delay: "animate-fade-up-delay-1",
    accent: true,
  },
  {
    href: "/free/compatibility",
    icon: "∞",
    title: "무료 궁합",
    subtitle: "두 운명의 교차점",
    delay: "animate-fade-up-delay-2",
    accent: false,
  },
  {
    href: "/free/taekil",
    icon: "📅",
    title: "무료 택일",
    subtitle: "좋은 날을 고르다",
    delay: "animate-fade-up-delay-3",
    accent: false,
  },
  {
    href: "/free/yearly",
    icon: "運",
    title: "무료 연운세",
    subtitle: "올해와 내년의 기운",
    delay: "animate-fade-up-delay-4",
    accent: false,
  },
];

export const metadata: Metadata = {
  title: "사주거리 — AI 사주·궁합·택일·연운세 무료 풀이",
  description:
    "전통 명리학과 AI를 결합한 사주 서비스. 생년월일로 무료 사주·궁합·택일·연운세를 확인하고, AI 역술가와 대화하며 깊이 있게 물어보세요. 사주 읽을거리와 용어 백과도 무료로 제공합니다.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      {/* Header */}
      <header className="relative px-6 pt-14 pb-8 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#1F3D34]/5" />
        <div className="absolute top-4 right-8 w-24 h-24 rounded-full bg-[#C8743A]/8" />

        {/* 로그인/회원가입 or 로그아웃 */}
        <div className="absolute top-6 right-6 z-10">
          <HeaderAuth isLoggedIn={isLoggedIn} />
        </div>

        <p className="text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2 animate-fade-up">
          Saju Street
        </p>
        <h1 className="font-serif text-[32px] font-bold text-[#1F3D34] leading-tight animate-fade-up" style={{animationDelay:'0.05s'}}>
          사주거리
        </h1>
        <p className="text-sm text-[#6B6661] mt-1.5 animate-fade-up" style={{animationDelay:'0.05s'}}>
          당신을 잘 아는 역술가들이 모인 골목
        </p>
      </header>

      {/* 콘텐츠 3카드 — 애드센스 심사 대비, 정보성 콘텐츠를 상단에 노출 */}
      <section className="px-4 grid grid-cols-3 gap-2 mb-4 animate-fade-up" style={{animationDelay:'0.08s'}}>
        {[
          { href: "/guide", icon: "書", title: "사주에 관하여", subtitle: `읽을거리 ${ARTICLES.length}편` },
          { href: "/dictionary", icon: "字", title: "사주 용어사전", subtitle: `핵심 용어 ${TERMS.length}개` },
          { href: "/faq", icon: "問", title: "자주 묻는 질문", subtitle: "양력·음력·시간" },
        ].map((c) => (
          <Link key={c.href} href={c.href}>
            <div className="h-full bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-3 py-3.5 flex flex-col gap-1.5 active:scale-[0.96] transition-all shadow-sm">
              <span className="font-serif text-lg font-bold text-[#C8743A] leading-none">{c.icon}</span>
              <div>
                <p className="text-[12.5px] font-semibold text-[#1F3D34] leading-tight">{c.title}</p>
                <p className="text-[10.5px] text-[#6B6661] mt-0.5 leading-tight">{c.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Service Cards Grid */}
      <section className="px-4 grid grid-cols-2 gap-3 mb-4">
        {MENU_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className={card.delay}>
            <div
              className={`relative overflow-hidden rounded-2xl p-5 min-h-[150px] flex flex-col justify-between active:scale-[0.96] transition-all duration-200 shadow-sm ${
                card.accent
                  ? "bg-[#1F3D34] text-white"
                  : "bg-[#FBF8F2] border border-[#E5DFD4] text-[#1A1A18]"
              }`}
            >
              <div
                className={`absolute -bottom-3 -right-2 font-serif text-[72px] leading-none select-none ${
                  card.accent ? "text-white/10" : "text-[#1F3D34]/6"
                }`}
              >
                {card.icon}
              </div>
              <span
                className={`font-serif text-3xl font-bold leading-none ${
                  card.accent ? "text-white/90" : "text-[#1F3D34]"
                }`}
              >
                {card.icon}
              </span>
              <div className="relative">
                <p className="font-semibold text-base leading-snug">{card.title}</p>
                <p className={`text-xs mt-0.5 ${card.accent ? "text-white/65" : "text-[#6B6661]"}`}>
                  {card.subtitle}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Banner Ad */}
      <section className="px-4 mb-4">
        <BannerAd />
      </section>

      {/* Divider */}
      <div className="px-4 flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#E5DFD4]" />
        <span className="text-xs text-[#6B6661] tracking-widest">사주 거리</span>
        <div className="flex-1 h-px bg-[#E5DFD4]" />
      </div>

      {/* Street Banner */}
      <section className="px-4 animate-fade-up" style={{animationDelay:'0.36s'}}>
        {isLoggedIn ? (
          <Link href="/street">
            <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 shadow-lg">
              <div className="absolute inset-0 opacity-20"
                style={{backgroundImage: "radial-gradient(circle at 80% 50%, #C8743A 0%, transparent 60%)"}}
              />
              <div className="relative w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0 border border-white/20">
                🏮
              </div>
              <div className="relative flex-1">
                <p className="font-bold text-lg text-white leading-snug">사주 거리 입장</p>
                <p className="text-sm text-white/65 mt-0.5">AI 역술가와 직접 대화하세요</p>
              </div>
              <div className="relative w-8 h-8 rounded-full bg-[#C8743A] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/login?redirect=/street">
            <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 shadow-lg">
              <div className="absolute inset-0 opacity-20"
                style={{backgroundImage: "radial-gradient(circle at 80% 50%, #C8743A 0%, transparent 60%)"}}
              />
              <div className="relative w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0 border border-white/20">
                🔒
              </div>
              <div className="relative flex-1">
                <p className="font-bold text-lg text-white leading-snug">사주 거리 입장</p>
                <p className="text-sm text-white/65 mt-0.5">로그인 후 이용할 수 있습니다</p>
              </div>
              <div className="relative w-8 h-8 rounded-full bg-[#C8743A]/60 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>
        )}
      </section>

      {/* Premium Banner */}
      <section className="px-4 mt-3 animate-fade-up" style={{animationDelay:'0.4s'}}>
        <Link href={isLoggedIn ? "/premium" : "/login?redirect=/premium"}>
          <div className="relative overflow-hidden rounded-2xl bg-[#FBF8F2] border border-[#C8743A]/40 p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 shadow-sm">
            <div className="relative w-14 h-14 rounded-xl bg-[#C8743A]/10 flex items-center justify-center text-3xl flex-shrink-0">
              🔮
            </div>
            <div className="relative flex-1">
              <p className="font-bold text-lg text-[#1A1A18] leading-snug">프리미엄 사주 풀이</p>
              <p className="text-sm text-[#6B6661] mt-0.5">내 사주 8개 영역 전체 심층 분석</p>
            </div>
            <div className="relative w-8 h-8 rounded-full bg-[#C8743A] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </Link>
      </section>

      {/* Teaser / onboarding nudge */}
      <section className="px-4 mt-3">
        <div className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C8743A]/10 flex items-center justify-center text-xl flex-shrink-0">
            ✦
          </div>
          <div className="flex-1">
            {isLoggedIn ? (
              <>
                <p className="text-xs text-[#6B6661] mb-0.5">사주를 등록하면</p>
                <p className="text-sm font-medium text-[#1A1A18]">맞춤 운세와 AI 상담을 받을 수 있어요</p>
              </>
            ) : (
              <>
                <p className="text-xs text-[#6B6661] mb-0.5">회원가입하면</p>
                <p className="text-sm font-medium text-[#1A1A18]">AI 역술가와 대화·사주 저장이 가능해요</p>
              </>
            )}
          </div>
          <Link
            href={isLoggedIn ? "/onboarding" : "/signup"}
            className="text-xs font-semibold text-[#C8743A] whitespace-nowrap"
          >
            {isLoggedIn ? "등록 →" : "가입 →"}
          </Link>
        </div>
      </section>

      {/* 읽을거리 */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm font-semibold text-[#1F3D34]">사주 읽을거리</p>
          <Link href="/guide" className="text-xs font-medium text-[#C8743A]">전체보기 →</Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {ARTICLES.slice(0, 3).map((a) => (
            <Link key={a.slug} href={`/guide/${a.slug}`}>
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3 active:scale-[0.98] transition-all">
                <p className="text-sm font-semibold text-[#1A1A18]">{a.title}</p>
                <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{a.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 서비스 소개 본문 — 홈에 착지한 방문자(및 크롤러)에게 사이트의 성격을 텍스트로 설명 */}
      <section className="px-5 mt-8 pt-7 border-t border-[#E5DFD4] flex flex-col gap-4">
        <h2 className="font-serif text-lg font-bold text-[#1F3D34]">사주거리는 어떤 곳인가요</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          사주거리는 전통 명리학의 해석 방식과 AI를 결합한 사주·운세 서비스입니다.
          생년월일과 태어난 시각을 입력하면 사주팔자 여덟 글자를 세우고, 오행의 균형과
          십성의 배치를 계산해 타고난 기질과 삶의 흐름을 풀어 드립니다.
          무료 사주와 궁합·택일·연운세를 광고 시청만으로 이용할 수 있고,
          더 깊은 풀이가 필요하면 AI 역술가와 직접 대화하며 이어서 물어볼 수 있습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">읽을거리와 용어 백과</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          사주를 처음 접하면 낯선 한자 용어에 가로막히기 쉽습니다. 그래서 사주거리는
          결과만 보여 주고 끝내지 않습니다. 사주란 무엇인지, 오행과 십성은 어떻게 읽는지부터
          부족한 기운을 채우는 전통적인 방법, 같은 사주를 가진 사람이 왜 다른 삶을 사는지까지
          {" "}{ARTICLES.length}편의 읽을거리로 정리해 두었습니다.
          비견·상관·도화살·역마살·용신·대운처럼 결과에 자주 등장하는 용어는
          용어 백과 {TERMS.length}항목에서 하나씩 찾아볼 수 있습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">결과를 대하는 태도</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          사주는 정해진 운명을 통보하는 것이 아니라, 타고난 기질과 삶의 리듬을 이해하는
          지도에 가깝습니다. 같은 사주를 가진 사람이 또래 중에 수십 명씩 있지만 그들의 삶이
          모두 같지 않다는 사실이 이를 잘 보여 줍니다. 강한 기운은 잘 살리고 부족한 기운은
          채워 가는 방향으로 활용할 때 의미가 있습니다.
          사주거리가 제공하는 콘텐츠는 오락 및 참고 목적으로 제공되며, 법률·의료·재정 등
          전문적 자문을 대체하지 않습니다.
        </p>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
