import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { KakaoAdFitBanner } from "@/components/ads/KakaoAdFitBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ONE_REPORT_PRICE, DESTINY_BLUEPRINT_ONE, REPORT_PRODUCTS } from "@/lib/billing/plans";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { listUserReports, type MyReport } from "@/lib/billing/my-reports";
import { isPremiumUser, countRemainingPasses, purchasedProductIds } from "@/lib/billing/access";
import { HomeSajuForm } from "@/components/home/HomeSajuForm";
import { HeaderAuth } from "./HeaderAuth";

/*
 * 홈 광고 구좌 — 애드핏 광고 단위 ID는 비밀이 아니다(렌더된 HTML의 data-ad-unit
 * 속성에 그대로 노출되는 공개 값). 발급받은 값을 코드 기본값으로 두고, 환경변수가
 * 있으면 그쪽을 우선한다. 이러면 배포 즉시 광고가 뜨고, 나중에 구좌를 바꿔야 할
 * 때는 코드 수정 없이 환경변수로 덮을 수 있다.
 *
 * ⚠️ 환경변수로 덮을 때는 반드시 NEXT_PUBLIC_ 접두사를 붙여야 한다. 접두사가 없으면
 * Next.js가 브라우저 번들에 주입하지 않아 클라이언트에서 늘 빈 값이 되고, 광고가
 * 조용히 사라진다(값이 비어 있으면 아무것도 그리지 않으므로 에러도 안 난다).
 */
const ADFIT_TOP_50 = process.env.NEXT_PUBLIC_ADFIT_UNIT_HOME_TOP_50 || "DAN-VpxPHTPwXLn4jngj";
const ADFIT_HOME_BANNER = process.env.NEXT_PUBLIC_ADFIT_UNIT_HOME_BANNER ?? "";
const ADFIT_MID_250 = process.env.NEXT_PUBLIC_ADFIT_UNIT_HOME_MID_250 || "DAN-8EnKwOX0icpAPeH5";

// 무료 4종 중 사주는 히어로 폼으로 승격됐다(§1). 나머지 3종은 폼 아래 보조 카드로.
const FREE_SECONDARY_CARDS = [
  { href: "/free/compatibility", icon: "∞", title: "무료 궁합" },
  { href: "/free/taekil", icon: "📅", title: "무료 택일" },
  { href: "/free/yearly", icon: "運", title: "무료 연운세" },
];

export const metadata: Metadata = {
  title: "사주거리 — 당신을 잘 아는 정확한 사주·궁합·택일·연운세",
  // 네이버 서치어드바이저 권장(80자 이내, 2026-08-25)
  description:
    "생년월일만으로 무료 사주·궁합·택일·연운세를 확인하세요. 프리미엄 리포트, 읽을거리·용어 백과·조견표도 무료 제공.",
  alternates: { canonical: "/" },
};

function extractYear(birthDate: string): string {
  return birthDate.slice(0, 4);
}

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const isLoggedIn = !!userId;

  // §1(2/3 문서, CEO 결정 2026-09-03): 신규/기존 분기 — 이미 있던
  // lib/billing/report-target.ts의 loadOwnProfile을 그대로 재사용한다(새
  // 조회 함수를 또 만들지 않는다). withDisplay로 화면 표시용 필드까지 받는다.
  let profile: Awaited<ReturnType<typeof loadOwnProfile>> = null;
  let reports: MyReport[] = [];
  let unusedPassCount = 0;
  let notYetBought: (typeof REPORT_PRODUCTS)[number][] = [];

  if (userId) {
    profile = await loadOwnProfile(userId, { withDisplay: true });
    if (profile) {
      reports = await listUserReports(userId);
      const premium = await isPremiumUser(userId);
      // 구독자는 "구매"라는 개념이 없어 이용권 소진 유도·크로스셀 문구가
      // 성립하지 않는다 — 이 두 블록은 비구독자에게만 보여준다.
      if (!premium) {
        unusedPassCount = await countRemainingPasses(userId);
        const bought = await purchasedProductIds(userId);
        notYetBought = REPORT_PRODUCTS.filter((p) => !bought.has(p.productId));
      }
    }
  }

  const identity = profile?.saju_json?.identity;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      {/* Header */}
      <header className="relative px-6 pt-14 pb-8 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#1F3D34]/5" />
        <div className="absolute top-4 right-8 w-24 h-24 rounded-full bg-[#C8743A]/8" />

        <div className="absolute top-6 right-6 z-10">
          <HeaderAuth isLoggedIn={isLoggedIn} />
        </div>

        <p className="text-xs font-medium tracking-[0.2em] text-[#9C5220] uppercase mb-2 animate-fade-up">
          Saju Street
        </p>
        <h1 className="font-serif text-[32px] font-bold text-[#1F3D34] leading-tight animate-fade-up" style={{animationDelay:'0.05s'}}>
          사주거리
        </h1>
        <p className="text-sm text-[#6B6661] mt-1.5 animate-fade-up" style={{animationDelay:'0.05s'}}>
          당신을 잘 아는 역술가들이 모인 골목
        </p>
      </header>

      {/* 상단 배너 — 첫 화면을 광고가 차지하지 않도록 작은 규격을 우선한다. */}
      <section className="px-4 mb-5 flex justify-center animate-fade-up" style={{animationDelay:'0.05s'}}>
        {ADFIT_TOP_50 ? (
          <KakaoAdFitBanner unit={ADFIT_TOP_50} width={320} height={50} />
        ) : (
          <KakaoAdFitBanner unit={ADFIT_HOME_BANNER} width={320} height={100} />
        )}
      </section>

      {profile ? (
        <>
          {/* ── 기존 방문자(사주 등록됨) — 와이어 B ───────────────────── */}
          <section className="px-4 mb-5 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <p className="font-serif text-lg font-bold text-[#1F3D34]">
              {identity?.day_master ?? "사주 등록됨"}
              {identity?.strength_label ? ` · ${identity.strength_label}` : ""}
              {profile.birth_date ? ` · ${extractYear(profile.birth_date)}년생` : ""}
            </p>
          </section>

          {reports.length > 0 && (
            <section className="px-4 mb-4">
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#1F3D34] mb-2">내 리포트 {reports.length}건</p>
                <ul className="flex flex-col gap-1.5">
                  {reports.slice(0, 3).map((r, i) => (
                    <li key={i}>
                      <Link href={r.href} className="flex items-center justify-between py-1 active:opacity-60">
                        <span className="text-[13px] text-[#1A1A18]">{r.label}</span>
                        <span className="text-xs text-[#6B6661]">
                          {r.created_at.slice(5, 10).replace("-", "/")} <span className="text-[#C8743A]">다시보기 →</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {reports.length > 3 && (
                  <Link href="/mypage" className="block text-center text-xs text-[#C8743A] font-medium mt-2 pt-2 border-t border-[#E5DFD4]">
                    전체 {reports.length}건 보기 →
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* "아직 안 본 리포트" — CEO 결정 2026-09-03: 두 개념을 분리한다.
              블록①(이용권 미사용)이 우선이다 — 이미 돈 낸 사람이 결과를 못
              받은 상태를 방치하면 CS·환불 요청으로 이어진다. */}
          {(unusedPassCount > 0 || notYetBought.length > 0) && (
            <section className="px-4 mb-4 flex flex-col gap-3">
              {unusedPassCount > 0 && (
                <div className="rounded-2xl border border-[#C8743A]/40 bg-[#FDF0E3] px-4 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1F3D34]">사용하지 않은 이용권 {unusedPassCount}장</p>
                    <p className="text-[11px] text-[#8A5228] mt-0.5">이미 결제하신 리포트를 아직 만들지 않았어요</p>
                  </div>
                  <Link
                    href="/premium/menu"
                    className="flex-shrink-0 text-xs font-semibold text-white bg-[#C8743A] rounded-full px-3.5 py-2 whitespace-nowrap"
                  >
                    지금 만들기
                  </Link>
                </div>
              )}

              {notYetBought.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#1F3D34] mb-2 px-1">아직 보지 않은 리포트</p>
                  <div className="grid grid-cols-3 gap-2">
                    {notYetBought.slice(0, 3).map((p) => (
                      <Link key={p.productId} href={p.path}>
                        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-2.5 py-3 text-center active:scale-[0.96] transition-all">
                          <p className="text-[12px] font-semibold text-[#1A1A18] leading-tight">{p.label}</p>
                          <p className="text-[10.5px] text-[#C8743A] mt-1">{ONE_REPORT_PRICE.toLocaleString()}원</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {notYetBought.length > 3 && (
                    <Link href="/premium/menu" className="block text-center text-xs text-[#C8743A] font-medium mt-2">
                      더보기 →
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 018(가족·지인 대상 사주) 진입점 — 기능만 만들고 입구가 없으면
              아무도 안 쓴다. 대상 전환 자체는 각 상품 화면의 확정 폼(SajuInputForm)
              안에 있어, 여기서는 상품을 고르는 메뉴로 보낸다. */}
          <section className="px-4 mb-4">
            <Link href="/premium/menu">
              <div className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-all">
                <div className="w-9 h-9 rounded-full bg-[#1F3D34]/8 flex items-center justify-center text-lg flex-shrink-0">👪</div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1A18]">가족·친구 사주도 볼 수 있어요</p>
                  <p className="text-[11px] text-[#6B6661] mt-0.5">다른 사람 사주 보기</p>
                </div>
                <span className="text-[#C8743A] text-sm flex-shrink-0">→</span>
              </div>
            </Link>
          </section>
        </>
      ) : (
        <>
          {/* ── 신규 방문자(사주 미등록) — 와이어 A ───────────────────── */}
          <section className="px-4 mb-3 animate-fade-up" style={{ animationDelay: "0.06s" }}>
            <p className="font-serif text-[19px] font-bold text-[#1F3D34] leading-snug text-center mb-4">
              생년월일만 넣으면
              <br />내 사주가 30초 만에 나옵니다
            </p>
            <HomeSajuForm />
          </section>

          {/* 무료 4종 중 나머지 3종 — 사주는 위 히어로 폼으로 승격됐다. */}
          <section className="px-4 grid grid-cols-3 gap-2 mb-5">
            {FREE_SECONDARY_CARDS.map((card) => (
              <Link key={card.href} href={card.href}>
                <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl px-2 py-3 text-center active:scale-[0.96] transition-all">
                  <span className="font-serif text-xl leading-none text-[#1F3D34]">{card.icon}</span>
                  <p className="text-[11.5px] font-medium text-[#1A1A18] mt-1.5 leading-tight">{card.title}</p>
                  <p className="text-[9.5px] text-[#8A8580] mt-1">무료 · 광고 5초</p>
                </div>
              </Link>
            ))}
          </section>

          <section className="px-4 mb-4 flex justify-center">
            <KakaoAdFitBanner unit={ADFIT_MID_250} width={300} height={250} />
          </section>

          {/* 친구들과 같이 보기 — 환장의 케미(별도 배포, Multi-Zone 프록시로 /chemi 제공) */}
          <section className="px-4 mb-4">
            <Link href="/chemi">
              <div className="rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-all">
                <div className="w-9 h-9 rounded-full bg-[#C8743A]/12 flex items-center justify-center text-lg flex-shrink-0">💬</div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1A18]">친구들과 같이 보기</p>
                  <p className="text-[11px] text-[#6B6661] mt-0.5">환장의 케미 — 단톡방 서열 정리</p>
                </div>
                <span className="text-xs font-semibold text-[#C8743A] flex-shrink-0 border border-[#C8743A]/30 rounded-full px-2.5 py-1">바로가기</span>
              </div>
            </Link>
          </section>

          {/* 더 자세히 보고 싶다면 — 프리미엄 */}
          <section className="px-4 mb-5 animate-fade-up" style={{animationDelay:'0.06s'}}>
            <Link href="/premium/menu">
              <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 shadow-lg">
                <div className="absolute inset-0 opacity-20"
                  style={{backgroundImage: "radial-gradient(circle at 80% 50%, #C8743A 0%, transparent 60%)"}}
                />
                <div className="relative w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0 border border-white/20">
                  🔮
                </div>
                <div className="relative flex-1">
                  <p className="text-xs text-[#C8743A] font-semibold mb-0.5">더 자세히 보고 싶다면</p>
                  <p className="font-bold text-base text-white leading-snug">프리미엄 리포트 {ONE_REPORT_PRICE.toLocaleString()}원부터</p>
                  <p className="text-xs text-white/60 mt-0.5">운명 설계도 {DESTINY_BLUEPRINT_ONE.amount.toLocaleString()}원 · 무엇이 다른가요?</p>
                </div>
                <div className="relative w-8 h-8 rounded-full bg-[#C8743A] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>
          </section>
        </>
      )}

      {/* 읽을거리·용어 백과·FAQ — 카드가 아니라 텍스트 링크로(§1-2). 자세한
          링크는 아래 SiteFooter에도 있지만, 스크롤 없이 눈에 띄는 자리에
          한 줄 더 둔다(2/3 문서 와이어 A). */}
      <section className="px-5 mb-2 text-center">
        <p className="text-xs text-[#6B6661]">
          <Link href="/guide" className="underline underline-offset-2">읽을거리</Link>
          {" · "}
          <Link href="/dictionary" className="underline underline-offset-2">용어 백과</Link>
          {" · "}
          <Link href="/faq" className="underline underline-offset-2">FAQ</Link>
        </p>
      </section>

      <SiteFooter />
      <BottomTabBar hasProfile={!!profile} />
    </div>
  );
}
