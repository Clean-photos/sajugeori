import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { SalpuriForm } from "./SalpuriForm";

export const metadata: Metadata = {
  title: "프리미엄 살풀이 | 사주거리",
  description:
    "내 사주에 어떤 살(殺)이 있는지 실제로 계산해 풀이합니다. 도화살·역마살·양인살·귀문관살부터 천을귀인·금여 같은 길신까지, 자리별 작용과 활용법을 함께 안내합니다.",
  alternates: { canonical: "/premium/salpuri" },
};

export default function PremiumSalpuriPage() {
  return (
    <PremiumGate
      title="프리미엄 살풀이"
      subtitle="내 사주에 든 살을 찾아 하나씩 풀이"
      path="/premium/salpuri"
      oneTime={{ productId: "salpuri_one", buyPath: "/premium/salpuri/buy", priceLabel: "990원" }}
      intro={
        <>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34]">살풀이란 무엇인가요</h2>
          <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
            살(殺)은 사주의 여덟 글자가 특정한 조합을 이룰 때 붙는 이름입니다.
            도화살·역마살처럼 널리 알려진 것부터 양인살·귀문관살·공망 같은 개념,
            천을귀인·문창귀인·금여 같은 길신까지 종류가 다양합니다.
            살풀이는 내 사주에 어떤 살이 들어 있는지 찾아, 그것이 무엇을 뜻하고
            어떻게 쓸 수 있는지를 하나씩 풀어 보는 것입니다.
          </p>

          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">자리에 따라 작용이 달라집니다</h2>
          <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
            같은 살이라도 사주의 네 기둥 중 어디에 놓였는지에 따라 작용하는 영역이 달라집니다.
            연지(年支)는 조상과 초년, 월지(月支)는 부모와 사회활동, 일지(日支)는 배우자와 본인,
            시지(時支)는 자식과 말년에 대응합니다.
            사주거리의 살풀이는 계산 엔진이 검출한 살과 그 위치를 근거로 리포트를 작성하므로,
            어느 영역에 어떻게 작용하는지까지 함께 확인할 수 있습니다.
          </p>

          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">흉살이라고 겁내지 않아도 됩니다</h2>
          <p className="text-[15px] text-[#1A1A18] leading-[1.85]">
            이름이 험한 살이 많지만, 신살은 길흉의 낙인이 아니라 그 자리에 놓인 기운의 성격을
            나타내는 좌표에 가깝습니다. 역마살이 과거에는 고단한 타향살이였다가 오늘날 활동력과
            글로벌 감각으로 읽히듯, 같은 글자도 시대와 쓰임에 따라 다르게 해석됩니다.
            사주거리는 겁을 주거나 부적·굿 같은 해소 비용을 유도하지 않습니다.
            살은 사주 해석의 보조 요소이며, 하나의 살로 운명이 정해지지 않습니다.
          </p>

          <p className="text-[13px] text-[#6B6661] leading-relaxed">
            각 살의 뜻이 궁금하다면 결제 없이 <a href="/dictionary" className="underline">사주 용어 백과</a>에서
            신살 26종을 포함한 48개 용어를 모두 읽어 보실 수 있습니다.
          </p>
        </>
      }
    >
      <SalpuriForm />
    </PremiumGate>
  );
}
