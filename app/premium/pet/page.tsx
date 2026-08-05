import type { Metadata } from "next";
import { PremiumGate } from "../_PremiumGate";
import { PetForm } from "./PetForm";

export const metadata: Metadata = {
  title: "프리미엄 반려동물 궁합 — 우리 아이와 나의 케미 | 사주거리",
  description:
    "강아지·고양이와 집사의 사주 궁합을 봅니다. 아이의 띠와 오행, 집사님의 일간을 함께 계산해 둘의 케미와 아이의 속마음, 함께하면 좋은 장소·색·방향까지 풀이합니다.",
  alternates: { canonical: "/premium/pet" },
};

export default function PremiumPetPage() {
  return (
    <PremiumGate
      title="프리미엄 반려동물 궁합"
      subtitle="우리 아이와 나는 어떤 인연일까"
      path="/premium/pet"
      oneTime={{ productId: "pet_one", buyPath: "/premium/buy?product=pet_one", priceLabel: "990원" }}
      intro={
        <>
          <h2 className="font-serif text-lg font-bold text-[#1F3D34]">반려동물도 궁합을 볼 수 있나요</h2>
          <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
            명리학 원전에는 동물의 사주를 보는 이론이 따로 없습니다. 다만 태어난 순간의 기운이
            그 생명에 새겨진다는 기본 전제를 따르면, 아이의 띠와 오행을 세워 집사님의 사주와
            어떻게 어울리는지 살펴볼 수는 있습니다. 사주거리의 반려동물 궁합은 이 방식으로,
            아이의 띠·오행과 집사님의 일간을 함께 계산해 둘의 결이 어떻게 맞물리는지 풀이합니다.
          </p>

          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">강아지는 강아지답게, 고양이는 고양이답게</h2>
          <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
            같은 기운이라도 강아지와 고양이는 그것을 전혀 다른 방식으로 드러냅니다.
            그래서 시작할 때 종을 먼저 고르게 하고, 동물행동학 연구에서 확인된 각 종의 특성을
            사주 해석에 함께 얹습니다. 강아지가 주인을 안전기지로 삼아 낯선 상황에서 집사님을
            돌아본다는 점, 고양이가 천천히 눈을 감았다 뜨는 슬로우 블링크로 신뢰를 표현한다는
            점처럼 실제로 연구된 행동의 결을 담아, 그 아이다운 풀이를 드립니다.
          </p>

          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">태어난 날을 몰라도 괜찮습니다</h2>
          <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
            반려동물은 정확한 생일을 모르는 경우가 많습니다. 태어난 해만 알아도 아이의 띠와
            타고난 오행을 세울 수 있어 궁합을 볼 수 있고, 달과 날을 알면 그만큼 더 정밀해집니다.
            입양한 아이라면 추정 나이로 계산한 해를 적어 주셔도 됩니다.
          </p>

          <h2 className="font-serif text-lg font-bold text-[#1F3D34] mt-2">이런 내용을 담습니다</h2>
          <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
            우리 아이가 어떤 성정을 타고났는지, 집사님은 어떤 결의 사람인지, 둘이 함께일 때
            어떤 케미가 만들어지는지를 차례로 풀이합니다. 아이가 집사님을 어떤 존재로 여기고
            있을지 짚어 드리고, 두 사람의 기운에 맞는 장소와 활동, 시밀러룩으로 맞추면 좋은
            색과 방향까지 안내합니다.
          </p>

          <p className="text-[13px] text-[#6B6661] leading-relaxed">
            반려동물 사주가 궁금하시다면 결제 없이{" "}
            <a href="/guide/do-pets-have-saju" className="underline">읽을거리</a>에서
            먼저 살펴보실 수 있습니다. 본 풀이는 오락 및 참고 목적으로 제공되며, 아이의 건강과
            관련한 문제는 반드시 수의사와 상담해 주세요.
          </p>
        </>
      }
    >
      <PetForm />
    </PremiumGate>
  );
}
