import type { Metadata } from "next";
import Link from "next/link";

const EFFECTIVE_DATE = "2026년 1월 1일";
const SERVICE_NAME = "사주거리";
const CONTACT_EMAIL = "privacy@sajugeori.com";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 사주거리",
  description: "사주거리가 수집하는 개인정보 항목과 이용 목적, 보유 기간, 파기 절차 및 이용자의 권리를 안내합니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
        <h1 className="font-serif text-[24px] font-bold text-white">개인정보처리방침</h1>
        <p className="text-sm text-white/50 mt-1">시행일: {EFFECTIVE_DATE}</p>
      </div>

      <div className="flex-1 px-5 py-7">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 text-sm text-[#1A1A18] leading-relaxed flex flex-col gap-6">

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">1. 수집하는 개인정보 항목</h2>
            <p className="text-[#6B6661] leading-relaxed">
              {SERVICE_NAME}는 서비스 제공을 위해 다음과 같은 최소한의 정보만 수집합니다.
            </p>
            <div className="mt-3 bg-[#F6F1E7] rounded-xl p-4 flex flex-col gap-2">
              {[
                ["이메일 주소", "계정 식별, 로그인, 서비스 안내"],
                ["별명 (닉네임)", "서비스 내 표시용"],
                ["생년월일 · 태어난 시각", "사주 계산 (서비스 핵심 기능)"],
                ["성별", "사주 계산 (대운 방향 결정)"],
                ["소셜 로그인 시: 제공자 식별값", "카카오·Google 연동 계정 식별"],
              ].map(([item, purpose]) => (
                <div key={item} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8743A] mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-[#1A1A18]">{item}</span>
                    <span className="text-[#6B6661]"> — {purpose}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6B6661] mt-3">
              주민등록번호, 전화번호, 실명, 주소 등 민감 정보는 수집하지 않습니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">2. 개인정보 이용 목적</h2>
            <ul className="flex flex-col gap-1.5 text-[#6B6661]">
              {[
                "사주 계산 및 AI 역술 서비스 제공",
                "계정 생성 및 로그인 인증",
                "유료 서비스 결제 처리 및 환불 대응",
                "서비스 관련 중요 안내 발송 (이메일)",
                "불법·부정 이용 방지",
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
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">3. 개인정보 보유 및 이용 기간</h2>
            <p className="text-[#6B6661] leading-relaxed">
              회원 탈퇴 시 즉시 삭제합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <div className="mt-3 bg-[#F6F1E7] rounded-xl p-4 flex flex-col gap-2 text-xs text-[#6B6661]">
              <div className="flex justify-between">
                <span>결제 기록</span>
                <span className="font-medium text-[#1A1A18]">5년 (전자상거래법)</span>
              </div>
              <div className="flex justify-between">
                <span>접속 로그</span>
                <span className="font-medium text-[#1A1A18]">3개월 (통신비밀보호법)</span>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">4. 제3자 제공</h2>
            <p className="text-[#6B6661] leading-relaxed">
              이용자의 동의 없이 제3자에게 개인정보를 제공하지 않습니다. 단, 결제 처리를 위해 PG사(Toss Payments 등)에 결제 관련 최소 정보가 전달될 수 있으며, 이는 결제 시점에 해당 PG사의 정책에 따라 처리됩니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">5. 쿠키 및 광고</h2>
            <p className="text-[#6B6661] leading-relaxed">
              본 서비스는 무료 콘텐츠 운영을 위해 Google AdSense 등 제3자 광고 서비스를 이용할 수 있습니다.
              Google 등 광고 제공업체는 이용자의 관심사에 맞는 광고를 제공하기 위해 쿠키를 사용하여 이 사이트 및 다른 사이트 방문 정보를 수집할 수 있습니다.
            </p>
            <p className="text-[#6B6661] leading-relaxed mt-2">
              이용자는{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#1F3D34] font-medium underline underline-offset-2">
                Google 광고 설정
              </a>
              에서 맞춤 광고를 거부할 수 있으며, 브라우저 설정에서 쿠키 사용을 차단할 수 있습니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">6. 이용자의 권리</h2>
            <p className="text-[#6B6661] leading-relaxed">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정, 삭제를 요청할 수 있습니다. 계정 설정 또는 아래 이메일로 요청하시면 5 영업일 이내에 처리합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">7. 개인정보 보호책임자</h2>
            <div className="bg-[#F6F1E7] rounded-xl p-4 text-[#6B6661] text-sm">
              <p>서비스명: {SERVICE_NAME}</p>
              <p className="mt-1">
                문의:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1F3D34] font-medium underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>

          <p className="text-xs text-[#6B6661] text-center pt-2">
            본 방침은 {EFFECTIVE_DATE}부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
