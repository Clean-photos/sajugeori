import type { Metadata } from "next";
import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ONE_REPORT_PRICE, BUNDLE_3, BUNDLE_ALL } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "프리미엄 운세 — 사주·궁합·택일·연운세·살풀이 | 사주거리",
  description:
    "사주 계산 엔진의 실제 데이터를 근거로 만드는 심층 풀이. 프리미엄 사주·궁합·택일·연운세·살풀이·반려동물 궁합 여섯 가지. 리포트 한 편 990원, 3종 선택권 2,700원, 전체 열람권 4,900원.",
  alternates: { canonical: "/premium/menu" },
};

/**
 * 여섯 종 모두 판매 중이다. 순서는 '다시 볼 이유가 있는 것'을 앞에 둔다.
 * 사주·살풀이는 내 사주가 바뀌지 않아 평생 한 번 보는 반면,
 * 궁합·반려동물은 대상이 늘 때마다, 택일·연운세는 시기가 올 때마다 다시 본다.
 */
const MENU_CARDS = [
  {
    href: "/premium/compatibility",
    icon: "∞",
    title: "프리미엄 궁합",
    subtitle: "두 사람의 사주를 양방향으로",
  },
  {
    href: "/premium/pet",
    icon: "🐾",
    title: "반려동물 궁합",
    subtitle: "우리 아이와 나의 케미",
  },
  {
    href: "/premium/taekil",
    icon: "📅",
    title: "프리미엄 택일",
    subtitle: "이사·개업·계약 좋은 날",
  },
  {
    href: "/premium/yearly",
    icon: "運",
    title: "프리미엄 연운세",
    subtitle: "올해와 내년, 월별 흐름",
  },
  {
    href: "/premium",
    icon: "☯",
    title: "프리미엄 사주",
    subtitle: "여덟 영역 심층 풀이",
  },
  {
    href: "/premium/salpuri",
    icon: "殺",
    title: "프리미엄 살풀이",
    subtitle: "내 사주에 든 살을 하나씩",
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
              <div aria-hidden="true" className="absolute -bottom-3 -right-2 font-serif text-[72px] leading-none select-none text-white/10">
                {card.icon}
              </div>
              <span className="font-serif text-3xl font-bold leading-none text-white/90">
                {card.icon}
              </span>
              <div className="relative">
                <p className="font-semibold text-base leading-snug">{card.title}</p>
                <p className="text-xs mt-0.5 text-white/65">{card.subtitle}</p>
                <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C8743A] text-white">
                  {ONE_REPORT_PRICE.toLocaleString()}원
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* 묶음권 — 단품 3개보다 저렴해 자연스럽게 상위 상품으로 유도한다 */}
      <section className="px-4 mt-4">
        <Link
          href={`/premium/buy?product=${BUNDLE_3.id}`}
          className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 active:scale-[0.98] transition-all"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">{BUNDLE_3.name}</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/25">가장 인기</span>
          </div>
          <p className="text-xs opacity-85 mt-1">
            원하는 리포트 3종을 골라 보세요 · {BUNDLE_3.amount.toLocaleString()}원
            (개당 {Math.round(BUNDLE_3.amount / 3).toLocaleString()}원)
          </p>
        </Link>
        <Link
          href={`/premium/buy?product=${BUNDLE_ALL.id}`}
          className="block rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] px-5 py-3.5 mt-2.5 active:scale-[0.98] transition-all"
        >
          <p className="text-sm font-semibold text-[#1F3D34]">{BUNDLE_ALL.name}</p>
          <p className="text-xs text-[#6B6661] mt-0.5">
            여섯 가지를 모두 · {BUNDLE_ALL.amount.toLocaleString()}원
            (개당 {Math.round(BUNDLE_ALL.amount / 6).toLocaleString()}원)
          </p>
        </Link>
      </section>

      {/* 기능 설명 — 결제 전 방문자와 크롤러가 읽을 실제 내용 */}
      <section className="px-5 mt-8 pt-7 border-t border-[#E5DFD4] flex flex-col gap-4">
        <h2 className="font-serif text-lg font-bold text-[#1F3D34]">무료 풀이와 무엇이 다른가요</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          무료 사주는 핵심만 간추린 요약형 풀이입니다. 프리미엄은 사주 계산 엔진이 산출한
          실제 데이터를 근거로 훨씬 길고 구체적인 리포트를 만듭니다. 일간의 강약과 용신,
          대운의 흐름, 지지끼리의 합과 충 같은 세부 요소까지 반영하므로 같은 생년월일이라도
          훨씬 개인화된 결과가 나옵니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">여섯 가지 프리미엄 풀이</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          프리미엄 사주는 성격·재물·직업·관계 등 여덟 영역을 나누어 깊이 풀이합니다.
          프리미엄 궁합은 두 사람의 사주를 양방향으로 비교해 서로에게 어떤 영향을 주고받는지 살핍니다.
          프리미엄 택일은 원하는 기간의 날짜를 일진 기준으로 채점해 내 사주와 맞는 날을 추려 주고,
          프리미엄 연운세는 그해의 세운과 열두 달의 월운을 함께 계산합니다.
          프리미엄 살풀이는 사주에 든 신살을 검출해 자리별 작용까지 풀어 줍니다.
          반려동물 궁합은 우리 아이의 띠·오행과 집사님의 사주를 함께 계산해, 둘의 케미와
          아이의 속마음을 강아지·고양이 각각의 특성에 맞게 풀이합니다.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">필요한 것만 골라서</h2>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          사주는 매달 새로 볼 만한 것이 아니라, 궁금할 때 한 번 제대로 보는 편이 맞습니다.
          그래서 사주거리는 정기 구독을 요구하지 않고 리포트 한 편에 {ONE_REPORT_PRICE.toLocaleString()}원으로,
          필요한 것만 골라 보실 수 있게 했습니다. 한 번 결제한 리포트는 저장되어 언제든 다시 열람할 수 있습니다.
        </p>
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          여러 편을 보실 계획이라면 묶음권이 낫습니다. 3종 선택권은 {BUNDLE_3.amount.toLocaleString()}원으로
          단품 세 편({(ONE_REPORT_PRICE * 3).toLocaleString()}원)보다 저렴하고, 전체 열람권은
          {" "}{BUNDLE_ALL.amount.toLocaleString()}원에 여섯 가지를 모두 볼 수 있습니다.
          묶음권으로 받은 이용권은 원하는 리포트에 자유롭게 쓰실 수 있습니다.
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
