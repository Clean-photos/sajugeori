import type { Metadata } from "next";
import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "프리미엄 운세 — 사주·궁합·택일·연운세·살풀이 | 사주거리",
  description:
    "사주 계산 엔진의 실제 데이터를 근거로 만드는 심층 풀이. 프리미엄 사주·궁합·택일·연운세·살풀이 다섯 가지를 소개합니다. 구독 5,900원(30일), 살풀이는 990원 1회 이용권도 있습니다.",
  alternates: { canonical: "/premium/menu" },
};

const MENU_CARDS = [
  {
    href: "/premium",
    icon: "☯",
    title: "프리미엄 사주",
    subtitle: "8개 영역 심층 풀이",
    ready: true,
  },
  {
    href: "/premium/compatibility",
    icon: "∞",
    title: "프리미엄 궁합",
    subtitle: "두 운명의 교차점, 심층 분석",
    ready: false,
  },
  {
    href: "/premium/taekil",
    icon: "📅",
    title: "프리미엄 택일",
    subtitle: "좋은 날을 정밀하게",
    ready: false,
  },
  {
    href: "/premium/yearly",
    icon: "運",
    title: "프리미엄 연운세",
    subtitle: "올해와 내년, 깊이 있게",
    ready: false,
  },
  {
    href: "/premium/salpuri",
    icon: "殺",
    title: "프리미엄 살풀이",
    subtitle: "내 사주에 든 살을 하나씩",
    ready: false,
  },
];

export default function PremiumMenuPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative px-6 pt-14 pb-6 overflow-hidden">
        <p className="text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">
          Premium
        </p>
        <h1 className="font-serif text-[28px] font-bold text-[#1F3D34] leading-tight">
          프리미엄 운세
        </h1>
        <p className="text-sm text-[#6B6661] mt-1">무료보다 더 깊은 풀이를 만나보세요</p>
      </header>

      <section className="px-4 grid grid-cols-2 gap-3">
        {MENU_CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="relative overflow-hidden rounded-2xl p-5 min-h-[150px] flex flex-col justify-between active:scale-[0.96] transition-all duration-200 shadow-sm bg-[#1F3D34] text-white">
              <div className="absolute -bottom-3 -right-2 font-serif text-[72px] leading-none select-none text-white/10">
                {card.icon}
              </div>
              <span className="font-serif text-3xl font-bold leading-none text-white/90">
                {card.icon}
              </span>
              <div className="relative">
                <p className="font-semibold text-base leading-snug">{card.title}</p>
                <p className="text-xs mt-0.5 text-white/65">{card.subtitle}</p>
                {!card.ready && (
                  <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C8743A]/30 text-[#F0C9A8]">
                    준비 중
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="px-4 mt-4">
        <Link
          href="/premium/subscribe"
          className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
        >
          <p className="text-sm font-semibold">프리미엄 구독하기</p>
          <p className="text-xs opacity-80 mt-0.5">5,900원 / 30일 · 역술가 대화 월 1,000회 포함</p>
        </Link>
      </section>

      {/* 기능 설명 — 결제 전 방문자와 크롤러가 읽을 실제 내용 */}
      <section className="px-5 mt-8 pt-7 border-t border-[#E5DFD4] flex flex-col gap-4">
        <h2 className="font-serif text-lg font-bold text-[#1F3D34]">무료 풀이와 무엇이 다른가요</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          무료 사주는 핵심만 간추린 요약형 풀이입니다. 프리미엄은 사주 계산 엔진이 산출한
          실제 데이터를 근거로 훨씬 길고 구체적인 리포트를 만듭니다. 일간의 강약과 용신,
          대운의 흐름, 지지끼리의 합과 충 같은 세부 요소까지 반영하므로 같은 생년월일이라도
          훨씬 개인화된 결과가 나옵니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">다섯 가지 프리미엄 풀이</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          프리미엄 사주는 성격·재물·직업·관계 등 여덟 영역을 나누어 깊이 풀이합니다.
          프리미엄 궁합은 두 사람의 사주를 양방향으로 비교해 서로에게 어떤 영향을 주고받는지 살핍니다.
          프리미엄 택일은 원하는 기간의 날짜를 일진 기준으로 채점해 내 사주와 맞는 날을 추려 주고,
          프리미엄 연운세는 그해의 세운과 열두 달의 월운을 함께 계산합니다.
          프리미엄 살풀이는 사주에 든 신살을 검출해 자리별 작용까지 풀어 줍니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">구독과 1회 이용권</h2>
        <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
          프리미엄 구독은 30일 동안 위 다섯 가지 풀이를 모두 이용할 수 있고,
          AI 역술가와의 대화도 월 1,000회까지 포함됩니다.
          한 가지만 가볍게 보고 싶다면 살풀이는 990원 1회 이용권으로도 확인할 수 있습니다.
          두 가지 이상 보실 계획이라면 구독이 더 유리합니다.
        </p>

        <p className="text-[13px] text-[#6B6661] leading-relaxed">
          결제 전에 사주 개념부터 살펴보고 싶다면{" "}
          <Link href="/guide" className="underline">사주 읽을거리</Link>와{" "}
          <Link href="/dictionary" className="underline">용어 백과</Link>를 무료로 이용하실 수 있습니다.
          본 서비스의 콘텐츠는 오락 및 참고 목적으로 제공됩니다.
        </p>
      </section>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
