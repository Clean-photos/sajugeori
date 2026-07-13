import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "서비스 소개 | 사주거리",
  description: "사주거리는 전통 명리학의 계산 원리와 AI 해석을 결합해, 누구나 쉽게 자신의 사주를 이해할 수 있도록 돕는 서비스입니다.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">About</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">서비스 소개</h1>
      </header>

      <div className="px-5 py-7 flex flex-col gap-6 text-[15px] text-[#1A1A18] leading-[1.85]">
        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">사주거리는 어떤 서비스인가요</h2>
          <p>
            사주거리는 전통 명리학(사주팔자)의 계산 원리와 인공지능(AI) 해석을 결합한 사주·운세 서비스입니다.
            생년월일시를 입력하면 온디바이스에서 사주 여덟 글자와 오행 분포, 강약, 용신, 대운의 흐름을 계산하고,
            그 결과를 바탕으로 이해하기 쉬운 해석을 제공합니다. 복잡한 한자와 어려운 명리 용어에 막히지 않고,
            누구나 자신의 타고난 기질과 삶의 리듬을 편하게 살펴볼 수 있도록 만드는 것이 저희의 목표입니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">무엇을 제공하나요</h2>
          <p>
            무료로 이용할 수 있는 일반 사주, 궁합, 택일, 연운세 콘텐츠와, 더 깊이 있는 분석을 원하는 분을 위한
            프리미엄 심층 풀이를 제공합니다. 또한 다섯 명의 개성 있는 AI 역술가 캐릭터와 대화하며
            자신의 사주에 대해 궁금한 점을 자유롭게 물어볼 수 있습니다.
            사주를 처음 접하는 분을 위한 <Link href="/guide" className="text-[#C8743A] underline underline-offset-2">읽을거리</Link>도 함께 준비했습니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">누구를 위한 서비스인가요</h2>
          <p>
            자신의 성격과 강점을 더 깊이 이해하고 싶은 분, 중요한 시기를 앞두고 삶의 흐름을 참고하고 싶은 분,
            소중한 사람과의 관계를 다른 관점에서 살펴보고 싶은 분을 위한 서비스입니다.
            사주를 맹신하기보다, 자신을 돌아보고 관계를 이해하는 하나의 도구로 가볍게 활용하시길 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">해석을 대하는 태도</h2>
          <p>
            사주거리가 제공하는 모든 해석은 오락 및 참고 목적입니다. 사주는 정해진 미래를 알려 주는 예언이 아니라,
            자신을 이해하고 삶을 성찰하는 참고 틀에 가깝습니다. 같은 사주라도 어떤 마음가짐으로 어떤 선택을 하며
            사느냐에 따라 삶은 얼마든지 달라집니다. 저희는 근거 없는 단정이나 불안을 부추기는 표현을 지양하고,
            실제 명리 계산에 기반한 차분한 해석을 전하고자 합니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">개인정보와 프라이버시</h2>
          <p>
            사주 계산의 핵심 과정은 이용자의 기기 내에서 처리되며, 저희는 필요한 최소한의 정보만을 안전하게 다룹니다.
            자세한 내용은 <Link href="/privacy" className="text-[#C8743A] underline underline-offset-2">개인정보처리방침</Link>과
            {" "}<Link href="/terms" className="text-[#C8743A] underline underline-offset-2">이용약관</Link>에서 확인하실 수 있습니다.
            서비스에 대한 의견이나 문의는 <Link href="/contact" className="text-[#C8743A] underline underline-offset-2">문의하기</Link>를 통해 남겨 주세요.
          </p>
        </section>

        <p className="text-xs text-[#6B6661]/70">
          사주거리는 개인이 운영하는 서비스이며, 더 나은 경험을 위해 계속 다듬어 가고 있습니다.
        </p>
      </div>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
