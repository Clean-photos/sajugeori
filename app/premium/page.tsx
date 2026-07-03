import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser } from "@/lib/billing/access";
import { PremiumReport } from "./PremiumReport";

// 비구독자에게 보여줄 잠긴 섹션 미리보기
const LOCKED_SECTIONS = [
  { label: "타고난 성격·기질", icon: "🧠" },
  { label: "직업운", icon: "💼" },
  { label: "재물운", icon: "💰" },
  { label: "연애·결혼운", icon: "❤️" },
  { label: "건강", icon: "🌿" },
  { label: "인생 패턴", icon: "🔄" },
  { label: "현재 대운", icon: "🌊" },
  { label: "연도별 운세", icon: "📆" },
];

export default async function PremiumPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const loggedIn = !!userId;
  const premium = userId ? await isPremiumUser(userId) : false;

  // 헤더에 실제 일주·강약 표시
  let subtitle = "내 사주 풀이";
  let hasProfile = false;
  if (userId) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles").select("saju_json")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p?.saju_json?.identity) {
      hasProfile = true;
      const dm = p.saju_json.identity.day_master ?? "";
      const st = p.saju_json.identity.strength_label ?? "";
      subtitle = [dm && `${dm}일간`, st].filter(Boolean).join(" · ") || subtitle;
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      <header className="px-5 pt-6 pb-4 bg-[#1B3A4B] text-white">
        <p className="text-xs opacity-70 mb-1">프리미엄 사주</p>
        <h1 className="text-xl font-bold">내 사주 풀이</h1>
        <p className="text-xs opacity-60 mt-1">{subtitle}</p>
      </header>

      {premium ? (
        hasProfile ? (
          <PremiumReport />
        ) : (
          <div className="px-4 pt-6">
            <Link href="/onboarding" className="block rounded-2xl bg-[#1B3A4B] text-white px-5 py-4 text-center text-sm font-semibold">
              풀이를 보려면 사주를 등록하세요
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="px-4 pt-4">
            <Link
              href={loggedIn ? "/premium/subscribe" : "/login?redirect=/premium/subscribe"}
              className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
            >
              <p className="text-sm font-semibold">프리미엄으로 전체 풀이 열람하기</p>
              <p className="text-xs opacity-80 mt-0.5">5,900원 / 30일 · 역술가 무제한 대화 포함</p>
            </Link>
          </div>

          <div className="px-4 py-4 flex flex-col gap-3">
            {LOCKED_SECTIONS.map((sec, i) => (
              <div key={i} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>{sec.icon}</span>
                  <span className="text-sm font-semibold text-[#1B3A4B]">{sec.label}</span>
                  <span className="ml-auto text-xs bg-[#1B3A4B]/10 text-[#1B3A4B] px-2 py-0.5 rounded-full">
                    프리미엄
                  </span>
                </div>
                <div className="h-14 bg-[#E5DFD4]/50 rounded-lg flex items-center justify-center">
                  <p className="text-xs text-[#6B6661]">🔒 결제 후 열람 가능</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomTabBar />
    </div>
  );
}
