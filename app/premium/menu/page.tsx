import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

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

      <BottomTabBar />
    </div>
  );
}
