import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "서비스 소개 | 사주거리",
  description: "사주거리는 정통 명리학의 계산 원리를 그대로 따라, 누구나 쉽게 자신의 사주를 이해할 수 있도록 돕는 서비스입니다.",
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

      <div className="px-5 py-7 flex flex-col gap-6 text-[16px] text-[#1A1A18] leading-[1.85]">
        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">사주거리는 어떤 서비스인가요</h2>
          <p>
            사주거리는 전통 명리학(사주팔자)의 계산 원리를 그대로 따르는 사주·운세 서비스입니다.
            생년월일시를 입력하면 온디바이스에서 사주 여덟 글자와 오행 분포, 강약, 용신, 대운의 흐름을 계산하고,
            그 결과를 바탕으로 이해하기 쉬운 해석을 제공합니다. 복잡한 한자와 어려운 명리 용어에 막히지 않고,
            누구나 자신의 타고난 기질과 삶의 리듬을 편하게 살펴볼 수 있도록 만드는 것이 저희의 목표입니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">무엇을 제공하나요</h2>
          <p>
            무료로 이용할 수 있는 일반 사주, 궁합, 택일, 연운세 콘텐츠와, 더 깊이 있는 분석을 원하는 분을 위한
            프리미엄 심층 리포트(사주·궁합·택일·연운세·살풀이)를 제공합니다.
            필요한 리포트만 990원에 한 편씩 결제해 볼 수 있습니다.
            사주를 처음 접하는 분을 위한 <Link href="/guide" className="text-[#C8743A] underline underline-offset-2">읽을거리</Link>도 함께 준비했습니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">사주는 어떻게 계산하나요</h2>
          <p>
            사주팔자를 세우는 일은 정해진 규칙을 따르는 계산입니다. 사주거리는 이 계산을
            자체 엔진으로 직접 수행합니다. 입력하신 생년월일시를 절기력으로 변환해
            연·월·일·시 네 기둥의 간지를 뽑고, 여덟 글자에 담긴 오행의 분포와
            일간의 강약(신강·신약), 십성의 배치, 지지끼리의 합·충, 그리고 10년 단위로
            흐르는 대운까지 산출합니다.
          </p>
          <p className="mt-2">
            여기서 중요한 것은 해가 바뀌는 기준이 1월 1일이 아니라 입춘이고, 달의 경계도
            절기라는 점입니다. 그래서 연초에 태어난 분은 달력상의 띠와 사주상의 띠가
            다를 수 있는데, 엔진이 이 변환을 자동으로 처리합니다. 태어난 시각을 모르시면
            시주를 제외한 세 기둥으로 계산합니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">AI는 어떤 역할을 하나요</h2>
          <p>
            AI가 사주를 지어내는 것이 아닙니다. 계산은 위의 엔진이 하고, AI는 그렇게
            산출된 실제 데이터를 근거로 해석을 문장으로 풀어내는 역할만 맡습니다.
            리포트를 만들 때 AI에게 전달되는 것은 일간과 강약, 오행 분포, 검출된 신살과
            그 위치, 대운의 간지와 우호도 같은 계산 결과이며, AI는 그 범위 안에서만
            서술하도록 지시받습니다.
          </p>
          <p className="mt-2">
            그래서 사주거리의 리포트에는 몇 가지 원칙이 적용됩니다. 계산 결과에 없는
            사실을 만들어 내지 않고, 겁을 주거나 불안을 부추기지 않으며, 부적이나 굿처럼
            금전 지출을 유도하는 표현을 넣지 않습니다. 다만 AI가 생성하는 문장인 만큼
            표현이 매끄럽지 않거나 부정확할 수 있으며, 명리학 자체가 유파에 따라 해석이
            갈리는 영역이라는 점도 함께 감안해 주시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mb-2">읽을거리는 어떻게 만드나요</h2>
          <p>
            사주 읽을거리와 용어 백과는 사주거리 편집팀이 작성합니다. 신살의 성립 조건이나
            조견표처럼 사실 관계가 분명한 내용은 자료를 확인한 뒤 싣고, 유파에 따라 견해가
            갈리는 대목은 갈린다는 사실을 함께 밝힙니다. 개운법처럼 전통 안에서 통용되지만
            과학적으로 검증되지 않은 내용은 그 위상을 분명히 적어 둡니다.
          </p>
          <p className="mt-2">
            또한 삼재 연도표나 간지 조견표처럼 손으로 만들기 번거로운 자료는 계산 엔진으로
            직접 산출해 제공합니다. 잘못된 내용을 발견하시면 문의하기를 통해 알려 주시면
            확인 후 정정하겠습니다.
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
