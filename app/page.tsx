import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { BannerAd } from "@/components/ads/BannerAd";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ARTICLES } from "./guide/articles";
import { pickDaily } from "@/lib/daily-pick";
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

      {/*
        서비스 소개 본문. 히어로 바로 아래·기능 카드 위에 둔다.
        이 글이 카드 아래에 있을 때는 크롤러가 페이지 앞부분에서 버튼·카드 라벨만 읽어
        사이트를 '입력 도구'로 인식하기 쉬웠다. 페이지를 여는 텍스트가 설명글이 되도록 올린다.
      */}
      <section className="px-5 mb-5 flex flex-col gap-3.5 animate-fade-up" style={{animationDelay:'0.06s'}}>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주거리는 전통 명리학의 해석 방식과 AI를 결합한 사주·운세 서비스입니다.
          생년월일과 태어난 시각을 입력하면 사주팔자 여덟 글자를 세우고, 오행의 균형과
          십성의 배치를 계산해 타고난 기질과 삶의 흐름을 풀어 드립니다. 무료 사주와
          궁합·택일·연운세를 광고 시청만으로 이용할 수 있고, 더 깊은 풀이가 필요하면
          AI 역술가와 직접 대화하며 이어서 물어볼 수 있습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">사주는 어떻게 계산되나요</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주는 태어난 연·월·일·시를 각각 하늘의 기운인 천간과 땅의 기운인 지지 한 쌍씩,
          모두 여덟 글자로 옮긴 것입니다. 이때 달과 해의 경계는 달력의 1일이나 1월 1일이
          아니라 입춘·경칩 같은 절기를 기준으로 나뉩니다. 사주거리는 이 절기 계산을 자동으로
          처리하며, 여덟 글자에 담긴 목·화·토·금·수 다섯 기운의 균형과 일간의 강약,
          그리고 10년 단위로 흐르는 대운까지 함께 산출합니다. 태어난 시각을 모르면 시주를
          제외한 세 기둥으로도 볼 수 있습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">AI는 무엇을 하나요</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주팔자를 세우고 오행과 십성을 계산하는 일은 정해진 규칙을 따르는 작업이라,
          사주거리에서는 자체 계산 엔진이 맡습니다. AI는 그렇게 산출된 실제 데이터를 근거로
          해석을 문장으로 풀어내는 역할을 합니다. 즉 AI가 사주를 지어내는 것이 아니라,
          계산된 결과를 읽기 쉽게 설명해 주는 구조입니다. 그래서 같은 사주에 대해 일관된
          기준으로 답하고, 궁금한 점은 몇 번이고 편하게 되물을 수 있습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">읽을거리와 용어 백과</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주를 처음 접하면 낯선 한자 용어에 가로막히기 쉽습니다. 그래서 사주거리는
          결과만 보여 주고 끝내지 않습니다. 사주란 무엇인지, 오행과 십성은 어떻게 읽는지부터
          부족한 기운을 채우는 전통적인 방법, 같은 사주를 가진 사람이 왜 다른 삶을 사는지까지
          {" "}{ARTICLES.length}편의 읽을거리로 정리해 두었습니다.
          비견·상관·도화살·역마살·용신·대운처럼 결과에 자주 등장하는 용어는
          용어 백과 {TERMS.length}항목에서 하나씩 찾아볼 수 있습니다.
          계산 엔진으로 직접 산출한{" "}
          <Link href="/reference/samjae" className="underline decoration-[#C8743A]/40 underline-offset-2">띠별 삼재 연도표</Link>와{" "}
          <Link href="/reference/ganji" className="underline decoration-[#C8743A]/40 underline-offset-2">출생 연도별 띠·간지 조견표</Link>도
          함께 두었습니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-1">결과를 대하는 태도</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주는 정해진 운명을 통보하는 것이 아니라, 타고난 기질과 삶의 리듬을 이해하는
          지도에 가깝습니다. 같은 사주를 가진 사람이 또래 중에 수십 명씩 있지만 그들의 삶이
          모두 같지 않다는 사실이 이를 잘 보여 줍니다. 강한 기운은 잘 살리고 부족한 기운은
          채워 가는 방향으로 활용할 때 의미가 있습니다. 사주거리가 제공하는 콘텐츠는 오락 및
          참고 목적으로 제공되며, 법률·의료·재정 등 전문적 자문을 대체하지 않습니다.
        </p>
      </section>

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
              {/*
                장식용 배경 글자. 텍스트 노드로 두면 크롤러가 아이콘을 두 번 읽어
                "☯ ☯ 무료 일반사주"처럼 노이즈가 된다. CSS 생성 콘텐츠로 넣어 HTML 본문에서 제외.
              */}
              <div
                aria-hidden="true"
                style={{ "--ico": `"${card.icon}"` } as React.CSSProperties}
                className={`absolute -bottom-3 -right-2 font-serif text-[72px] leading-none select-none before:content-[var(--ico)] ${
                  card.accent ? "text-white/10" : "text-[#1F3D34]/6"
                }`}
              />
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
        <Link href="/premium/menu">
          <div className="relative overflow-hidden rounded-2xl bg-[#FBF8F2] border border-[#C8743A]/40 p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 shadow-sm">
            <div className="relative w-14 h-14 rounded-xl bg-[#C8743A]/10 flex items-center justify-center text-3xl flex-shrink-0">
              🔮
            </div>
            <div className="relative flex-1">
              <p className="font-bold text-lg text-[#1A1A18] leading-snug">프리미엄 운세보기</p>
              <p className="text-sm text-[#6B6661] mt-0.5">사주·궁합·택일·연운세·살풀이 심층 풀이</p>
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
          {pickDaily(ARTICLES, 3).map((a) => (
            <Link key={a.slug} href={`/guide/${a.slug}`}>
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-4 py-3 active:scale-[0.98] transition-all">
                <p className="text-sm font-semibold text-[#1A1A18]">{a.title}</p>
                <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{a.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
