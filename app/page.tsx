import Link from "next/link";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { BannerAd } from "@/components/ads/BannerAd";
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

      <BottomTabBar />
    </div>
  );
}
