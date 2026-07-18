import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser } from "@/lib/billing/access";

type GateState =
  | { ok: true }
  | { ok: false; kind: "login" | "subscribe" | "onboarding" };

async function checkGate(): Promise<GateState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, kind: "login" };
  if (!(await isPremiumUser(userId))) return { ok: false, kind: "subscribe" };

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
  title, subtitle, path, children,
}: {
  title: string; subtitle: string; path: string; children: React.ReactNode;
}) {
  const gate = await checkGate();

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
              <p className="text-sm font-medium text-[#1A1A18]">프리미엄 구독자 전용 기능이에요</p>
              <p className="text-xs text-[#6B6661] max-w-[240px] leading-relaxed">5,900원 / 30일로 프리미엄 3종 분석과 역술가 대화(월 1,000회)를 이용하세요.</p>
              <Link href="/premium/subscribe" className="rounded-xl bg-[#C8743A] text-white px-6 py-3 text-sm font-semibold">프리미엄 구독하기</Link>
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

      <BottomTabBar />
    </div>
  );
}
