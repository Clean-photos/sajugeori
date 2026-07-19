import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass } from "@/lib/billing/access";

/** 구독 없이 단건 이용권으로도 통과할 수 있는 기능의 이용권 옵션 */
export interface OneTimeOption {
  productId: string;   // plans.ts의 one_time 상품 id
  buyPath: string;     // 결제 페이지 경로
  priceLabel: string;  // 예: "990원 · 1회"
}

type GateState =
  | { ok: true }
  | { ok: false; kind: "login" | "subscribe" | "onboarding" };

async function checkGate(oneTime?: OneTimeOption): Promise<GateState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, kind: "login" };

  const premium = await isPremiumUser(userId);
  const hasPass = !premium && oneTime
    ? (await findUnusedOneTimePass(userId, oneTime.productId)) !== null
    : false;
  if (!premium && !hasPass) return { ok: false, kind: "subscribe" };

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles").select("id")
    .eq("user_id", userId).eq("label", "본인")
    .order("created_at", { ascending: false }).limit(1).single();
  if (!profile?.id) return { ok: false, kind: "onboarding" };

  return { ok: true };
}

/**
 * 프리미엄 콘텐츠 페이지 공통 셸. 헤더 + 게이트(로그인/구독/사주등록) 처리.
 * 통과 시 children(폼)을 렌더. 궁합·연운세·택일이 공유한다.
 */
export async function PremiumGate({
  title, subtitle, path, children, oneTime, intro,
}: {
  title: string; subtitle: string; path: string; children: React.ReactNode;
  oneTime?: OneTimeOption;
  /**
   * 게이트에 막힌 방문자에게 보여 줄 공개 설명. 기능이 무엇인지 알려 주는 역할과 함께,
   * 크롤러가 읽을 실제 텍스트를 확보해 준다(게이트만 있으면 빈 페이지로 인식됨).
   */
  intro?: React.ReactNode;
}) {
  const gate = await checkGate(oneTime);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/premium/menu" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          프리미엄
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">{title}</h1>
        <p className="relative text-sm text-white/60 mt-1">{subtitle}</p>
      </div>

      {gate.ok ? (
        children
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8 py-20">
          <div className="w-14 h-14 rounded-full bg-[#1F3D34]/8 flex items-center justify-center text-2xl">
            {gate.kind === "subscribe" ? "🔮" : "🔒"}
          </div>
          {gate.kind === "login" && (
            <>
              <p className="text-sm font-medium text-[#1A1A18]">로그인이 필요해요</p>
              <Link href={`/login?redirect=${path}`} className="rounded-xl bg-[#C8743A] text-white px-6 py-3 text-sm font-semibold">로그인하기</Link>
            </>
          )}
          {gate.kind === "subscribe" && (
            <>
              <p className="text-sm font-medium text-[#1A1A18]">프리미엄 전용 기능이에요</p>
              <p className="text-xs text-[#6B6661] max-w-[240px] leading-relaxed">5,900원 / 30일로 프리미엄 전체 분석과 역술가 대화(월 1,000회)를 이용하세요.</p>
              <Link href="/premium/subscribe" className="rounded-xl bg-[#C8743A] text-white px-6 py-3 text-sm font-semibold">프리미엄 구독하기</Link>
              {oneTime && (
                <>
                  <p className="text-xs text-[#6B6661] mt-1">구독 없이 이번 한 번만 보고 싶다면</p>
                  <Link href={oneTime.buyPath} className="rounded-xl border border-[#C8743A] text-[#C8743A] px-6 py-3 text-sm font-semibold">
                    {oneTime.priceLabel}로 1회 이용하기
                  </Link>
                </>
              )}
            </>
          )}
          {gate.kind === "onboarding" && (
            <>
              <p className="text-sm font-medium text-[#1A1A18]">먼저 사주를 등록해주세요</p>
              <Link href="/onboarding" className="rounded-xl bg-[#C8743A] text-white px-6 py-3 text-sm font-semibold">사주 등록하기</Link>
            </>
          )}
        </div>
      )}

      {!gate.ok && intro && (
        <section className="px-5 pb-10 pt-7 border-t border-[#E5DFD4] flex flex-col gap-4">
          {intro}
        </section>
      )}

      <BottomTabBar />
    </div>
  );
}
