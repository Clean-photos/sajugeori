import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { LogoutButton } from "./LogoutButton";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

export default async function MypagePage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  let profile: { label: string; birth_date: string; gender: string; saju_json: { identity?: { day_master?: string; strength_label?: string } } } | null = null;
  let payments: { plan: string | null; status: string; created_at: string }[] = [];

  if (loggedIn) {
    const userId = session!.user!.id;

    const { data: p } = await supabaseAdmin
      .from("saju_profiles")
      .select("label, birth_date, gender, saju_json")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p) profile = p;

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (subs) payments = subs;
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-[#1B3A4B]">보관함</h1>
        <p className="text-sm text-[#6B6661] mt-0.5">내 정보 · 저장된 사주 · 결제 내역</p>
      </header>

      <div className="px-4 flex flex-col gap-3">
        {/* 내 사주 */}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#1B3A4B] mb-2">내 사주</p>

          {!loggedIn ? (
            <>
              <p className="text-sm text-[#6B6661]">로그인 후 사주를 등록하세요</p>
              <a href="/login" className="mt-3 block text-center bg-[#1B3A4B] text-white rounded-xl py-2.5 text-sm font-medium">
                로그인
              </a>
            </>
          ) : profile ? (
            <>
              <p className="text-sm text-[#1A1A18]">
                {profile.saju_json?.identity?.day_master ?? "사주 등록됨"}
                {profile.saju_json?.identity?.strength_label ? ` · ${profile.saju_json.identity.strength_label}` : ""}
              </p>
              <p className="text-xs text-[#6B6661] mt-1">
                {profile.birth_date} · {profile.gender === "M" ? "남성" : "여성"}
              </p>
              <a href="/premium" className="mt-3 block text-center bg-[#C8743A] text-white rounded-xl py-2.5 text-sm font-semibold">
                프리미엄 사주 풀이 보기
              </a>
              <a href="/onboarding" className="mt-2 block text-center border border-[#E5DFD4] text-[#1B3A4B] rounded-xl py-2.5 text-sm font-medium">
                사주 다시 등록
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-[#6B6661]">아직 등록된 사주가 없어요</p>
              <a href="/onboarding" className="mt-3 block text-center bg-[#1B3A4B] text-white rounded-xl py-2.5 text-sm font-medium">
                사주 등록하기
              </a>
            </>
          )}
        </div>

        {/* 결제 내역 */}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#1B3A4B] mb-2">결제 내역</p>
          {payments.length === 0 ? (
            <p className="text-sm text-[#6B6661]">결제 내역이 없습니다</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {payments.map((pay, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-[#1A1A18]">{pay.plan ?? "프리미엄"}</span>
                  <span className="text-[#6B6661]">
                    {pay.status === "active" ? "이용중" : pay.status === "canceled" ? "해지" : "만료"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 로그아웃 */}
        {loggedIn && (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl px-4">
            <LogoutButton />
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
