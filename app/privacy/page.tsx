import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_PATH } from "@/lib/site";
import { SiteFooter } from "@/components/layout/SiteFooter";

const EFFECTIVE_DATE = "2026년 1월 1일";
const SERVICE_NAME = "사주거리";


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
                ["다른 분의 이름(별명)·생년월일·태어난 시각·성별", "이용자가 직접 입력해 저장한 가족·지인 사주 계산 (이용자 본인이 입력하며, 목록에서 고르기 위한 이름은 서비스 화면 표시에만 쓰입니다)"],
                ["반려동물 이름·종·태어난 해(달·일)", "반려동물 궁합 계산 (입력한 경우에 한함)"],
                ["소셜 로그인 시: 제공자 식별값", "카카오·Google 연동 계정 식별"],
                ["결제 시: 주문번호·결제금액·결제 상태", "결제 처리 및 이용권 관리 (카드번호 등 결제수단 정보는 결제대행사가 처리하며 서비스는 저장하지 않습니다)"],
                ["서비스 이용 기록(접속 기록·쿠키·기기 식별 정보)", "서비스 이용 분석, 부정 이용 방지, 광고 제공"],
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
              <div className="flex justify-between">
                <span>유료 리포트 생성 결과</span>
                <span className="font-medium text-[#1A1A18]">1년 (서비스 정책) — 자동 삭제</span>
              </div>
            </div>
            <p className="text-[#6B6661] leading-relaxed mt-3">
              위 리포트 보관기간은 사주거리(sajugeori.com) 서비스에 적용됩니다.
              같은 도메인에서 함께 제공되는 환장의 케미(/chemi)는 별도 서비스로, 방에 참여하며
              입력한 닉네임·생년월일과 그 결과 데이터를 12시간만 보관한 뒤 삭제하는 등
              사주거리와 다른 보유기간 정책을 따릅니다. 자세한 내용은 해당 서비스 화면의 안내를 참고해 주세요.
            </p>
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
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">5. 개인정보 처리위탁 및 국외 이전</h2>
            <p className="text-[#6B6661] leading-relaxed">
              서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁하거나 이전합니다. 해외 업체는 서비스를
              이용하는 시점에 네트워크(암호화 통신)를 통해 아래 항목이 전송됩니다.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {[
                {
                  name: "Anthropic, PBC", country: "미국", task: "AI 리포트(사주·궁합·택일·연운세·살풀이·반려동물·운명 설계도) 문장 생성",
                  items: "생년월일·태어난 시각·성별을 기반으로 계산한 사주 정보, 반려동물 이름·종·태어난 해(입력 시)", period: "생성 요청 처리 후 서비스가 보관하지 않으며, 업체 정책에 따른 일정 기간 내 삭제",
                },
                {
                  name: "Vercel Inc.", country: "미국 (서비스 실행 서버는 대한민국 서울 리전 사용)", task: "웹 서비스 호스팅·서버리스 실행·접속 로그 처리",
                  items: "서비스 이용 중 처리되는 모든 입력 정보와 접속 기록", period: "접속 로그는 업체 정책에 따른 단기 보관, 그 외는 저장하지 않음",
                },
                {
                  name: "Supabase Inc.", country: "해외 서버(데이터 저장 리전은 서비스 설정에 따름)", task: "회원·사주 정보·리포트 결과 데이터베이스 저장",
                  items: "이메일, 별명, 생년월일·태어난 시각·성별, 다른 분 정보, 반려동물 정보, 리포트 결과, 결제 기록", period: "본 방침 3항의 보유 기간과 같음 (회원 탈퇴 시 즉시 삭제)",
                },
                {
                  name: "Google LLC", country: "미국", task: "접속 분석(Google Analytics)·광고(AdSense)·Google 로그인",
                  items: "쿠키·기기 식별 정보, 접속 기록, Google 로그인 시 이메일·계정 식별값", period: "업체 정책에 따름",
                },
                {
                  name: "주식회사 카카오", country: "대한민국", task: "카카오 로그인·카카오 애드핏 광고",
                  items: "카카오 로그인 시 계정 식별값·이메일, 광고 노출 관련 기기 식별 정보", period: "업체 정책에 따름",
                },
                {
                  name: "토스페이먼츠 주식회사", country: "대한민국", task: "결제 처리",
                  items: "주문번호, 결제금액, 결제 상태 (결제수단 정보는 토스페이먼츠가 직접 처리)", period: "5년 (전자상거래법)",
                },
              ].map((v) => (
                <div key={v.name} className="bg-[#F6F1E7] rounded-xl p-4 text-xs text-[#6B6661] leading-relaxed">
                  <p className="font-semibold text-sm text-[#1A1A18]">{v.name}</p>
                  <p className="mt-1"><span className="text-[#1A1A18]">위탁·이전 업무</span> — {v.task}</p>
                  <p><span className="text-[#1A1A18]">이전 국가</span> — {v.country}</p>
                  <p><span className="text-[#1A1A18]">이전 항목</span> — {v.items}</p>
                  <p><span className="text-[#1A1A18]">이전 시기·방법</span> — 서비스 이용 시 네트워크 전송</p>
                  <p><span className="text-[#1A1A18]">보유·이용 기간</span> — {v.period}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6B6661] mt-3">
              국외 이전을 거부하면 해당 업체가 필요한 기능(AI 리포트 생성 등)을 이용하실 수 없습니다. 거부 의사는
              아래 &lsquo;개인정보 보호책임자&rsquo; 항목의 방법으로 알려 주세요.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">6. 쿠키 및 광고</h2>
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
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">7. 이용자의 권리</h2>
            <p className="text-[#6B6661] leading-relaxed">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정, 삭제를 요청할 수 있습니다. 계정 설정에서 직접 처리하시거나, 아래 &lsquo;개인정보 보호책임자&rsquo; 항목의 방법으로 요청하시면 5 영업일 이내에 처리합니다.
            </p>
          </section>

          <div className="h-px bg-[#E5DFD4]" />

          <section>
            <h2 className="font-semibold text-base text-[#1F3D34] mb-2">8. 개인정보 보호책임자</h2>
            <div className="bg-[#F6F1E7] rounded-xl p-4 text-[#6B6661] text-sm">
              <p>서비스명: {SERVICE_NAME}</p>
              <p className="mt-1">
                문의:{" "}
                <Link href={CONTACT_PATH} className="text-[#1F3D34] font-medium underline underline-offset-2">
                  문의하기 페이지
                </Link>
                를 통해 접수해 주시면 확인 후 답변드립니다.
              </p>
              {CONTACT_EMAIL && (
                <p className="mt-1">
                  이메일:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1F3D34] font-medium underline underline-offset-2">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              )}
            </div>
          </section>

          <p className="text-xs text-[#6B6661] text-center pt-2">
            본 방침은 {EFFECTIVE_DATE}부터 시행됩니다.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
