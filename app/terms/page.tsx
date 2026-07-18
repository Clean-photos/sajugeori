import Link from "next/link";

const EFFECTIVE_DATE = "2026년 1월 1일";
const SERVICE_NAME = "사주거리";
const CONTACT_EMAIL = "support@sajugeori.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      {/* Header */}
      <div className="bg-[#1F3D34] px-6 pt-14 pb-7">
        <Link href="/" className="flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          돌아가기
        </Link>
        <h1 className="font-serif text-[24px] font-bold text-white">이용약관</h1>
        <p className="text-sm text-white/50 mt-1">시행일: {EFFECTIVE_DATE}</p>
      </div>

      <div className="flex-1 px-5 py-7">
        {/* Disclaimer banner — 가장 먼저, 눈에 띄게 */}
        <div className="bg-[#C8743A]/10 border border-[#C8743A]/30 rounded-2xl p-5 mb-4 flex gap-3">
          <div className="text-xl flex-shrink-0 mt-0.5">⚠️</div>
          <div>
            <p className="font-semibold text-sm text-[#C8743A] mb-1.5">오락·참고 목적 서비스 안내</p>
            <p className="text-sm text-[#6B6661] leading-relaxed">
              {SERVICE_NAME}가 제공하는 사주·운세 콘텐츠는 <strong className="text-[#1A1A18]">오락 및 참고 목적</strong>으로만 제공됩니다.
              어떠한 경우에도 <strong className="text-[#1A1A18]">법률·의료·정신건강·재정·투자 자문</strong>을 대체하지 않으며,
              그렇게 해석되어서는 안 됩니다.
              중요한 결정을 내리기 전에는 반드시 해당 분야 전문가와 상담하시기 바랍니다.
            </p>
          </div>
        </div>

        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 text-sm text-[#1A1A18] leading-relaxed flex flex-col gap-6">

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">1. 목적</h2>
            <p className="text-[#6B6661] leading-relaxed">
              본 약관은 {SERVICE_NAME}(이하 "서비스")가 제공하는 모든 서비스의 이용 조건과 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">2. 서비스의 성격 및 면책</h2>

            <div className="flex flex-col gap-4">
              <div className="bg-[#F6F1E7] rounded-xl p-4">
                <p className="font-medium text-[#1A1A18] mb-2">2-1. 오락·참고 목적 한정</p>
                <p className="text-[#6B6661] leading-relaxed">
                  본 서비스의 사주·운세·궁합·택일 등 모든 콘텐츠는 한국 전통 명리학을 기반으로 한 오락 및 참고 목적의 정보입니다.
                  과학적으로 검증된 사실이 아니며, 미래를 예언하거나 보장하지 않습니다.
                </p>
              </div>

              <div className="bg-[#F6F1E7] rounded-xl p-4">
                <p className="font-medium text-[#1A1A18] mb-2">2-2. 전문 자문 대체 불가</p>
                <p className="text-[#6B6661] leading-relaxed">
                  본 서비스는 다음 분야의 전문적인 자문을 대체하지 않습니다.
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[#6B6661]">
                  {[
                    "법률 자문 (변호사, 법무사 등)",
                    "의료·정신건강 자문 (의사, 상담사, 심리치료사 등)",
                    "재정·투자 자문 (공인재무설계사, 투자 전문가 등)",
                    "기타 전문 면허를 요구하는 서비스",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[#C8743A] flex-shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#F6F1E7] rounded-xl p-4">
                <p className="font-medium text-[#1A1A18] mb-2">2-3. 이용자의 자기 책임</p>
                <p className="text-[#6B6661] leading-relaxed">
                  서비스에서 제공하는 정보를 기반으로 이용자가 내린 모든 결정과 그 결과에 대한 책임은 전적으로 이용자 본인에게 있습니다.
                  서비스는 이용자의 결정으로 인해 발생한 직접적·간접적 손해에 대해 책임지지 않습니다.
                </p>
              </div>

              <div className="bg-[#F6F1E7] rounded-xl p-4">
                <p className="font-medium text-[#1A1A18] mb-2">2-4. AI 생성 콘텐츠</p>
                <p className="text-[#6B6661] leading-relaxed">
                  본 서비스의 일부 콘텐츠는 AI(인공지능) 언어 모델이 생성합니다. AI는 오류, 편향, 부정확한 정보를 포함할 수 있으며, 서비스는 AI 생성 콘텐츠의 정확성이나 완전성을 보장하지 않습니다.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">3. 이용 자격</h2>
            <p className="text-[#6B6661] leading-relaxed">
              만 14세 미만은 법정대리인의 동의 없이 회원가입을 할 수 없습니다.
              회원가입 시 만 14세 이상임을 확인한 것으로 간주합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">4. 금지 행위</h2>
            <ul className="flex flex-col gap-1.5 text-[#6B6661]">
              {[
                "타인의 개인정보를 도용하여 가입하는 행위",
                "서비스 콘텐츠를 무단으로 복제·배포·상업적으로 이용하는 행위",
                "서비스 시스템에 부하를 주거나 정상적인 운영을 방해하는 행위",
                "서비스 정보를 이용한 불법적 예언·역술업 영업 행위",
                "타 이용자를 비방하거나 혐오 콘텐츠를 생성하는 행위",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C8743A] flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">5. 유료 서비스 및 환불</h2>
            <p className="text-[#6B6661] leading-relaxed">
              유료 서비스는 결제 완료 시점부터 즉시 제공됩니다.
              디지털 콘텐츠 특성상 서비스 이용 개시 후에는 환불이 제한될 수 있으며,
              미사용 구독 기간에 대한 환불은 관계 법령(전자상거래법 제17조)에 따릅니다.
              환불 문의는 아래 이메일로 연락해주세요.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">6. 이용 한도 (공정 사용 정책)</h2>
            <p className="text-[#6B6661] leading-relaxed">
              안정적인 서비스 제공을 위해 일부 기능에는 공정 사용 정책에 따른 이용 한도가 적용됩니다.
              무료 회원의 AI 역술가 대화는 누적 20회, 유료(프리미엄) 회원의 AI 역술가 대화는
              월 1,000회(매월 1일 0시 한국 시간 기준 초기화)로 제한됩니다.
              한도에 도달한 경우 해당 기능 이용이 일시 제한되며, 유료 회원의 한도는 다음 달 1일에 자동으로 초기화됩니다.
              서비스는 운영 상황에 따라 한도를 변경할 수 있으며, 변경 시 서비스 내 공지 등으로 안내합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">7. 서비스 변경 및 중단</h2>
            <p className="text-[#6B6661] leading-relaxed">
              서비스는 운영상·기술상 필요에 따라 서비스 내용을 변경하거나 중단할 수 있습니다.
              중요한 변경 사항은 서비스 내 공지 또는 등록된 이메일로 사전 안내합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">8. 준거법 및 관할</h2>
            <p className="text-[#6B6661] leading-relaxed">
              본 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 서비스 소재지 관할 법원을 전속 관할 법원으로 합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">9. 사업자 정보</h2>
            <p className="text-[#6B6661] leading-relaxed">
              본 서비스는 개인 운영자가 제공하며, 현재 통신판매업 신고 전 단계입니다.
              사업자등록번호 등 상세 사업자 정보는 등록 완료 후 본 페이지에 게시합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">10. 문의</h2>
            <div className="bg-[#F6F1E7] rounded-xl p-4 text-[#6B6661]">
              <p>서비스명: {SERVICE_NAME}</p>
              <p className="mt-1">
                이메일:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1F3D34] font-medium underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>

          <p className="text-xs text-[#6B6661] text-center pt-2">
            본 약관은 {EFFECTIVE_DATE}부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
