import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { LogoutButton } from "./LogoutButton";
import { DangerZone } from "./DangerZone";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { REPORT_PRODUCTS, DESTINY_PRODUCT_IDS } from "@/lib/billing/plans";
import { listUserReports } from "@/lib/billing/my-reports";

export default async function MypagePage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  let profile: { label: string; birth_date: string; gender: string; saju_json: { identity?: { day_master?: string; strength_label?: string } } } | null = null;
  let payments: { label: string; status: string; created_at: string; amount?: number }[] = [];
  let reports: { label: string; href: string; created_at: string }[] = [];
  let isEmailAccount = false;

  if (loggedIn) {
    const userId = session!.user!.id;

    const { data: p } = await supabaseAdmin
      .from("saju_profiles")
      .select("label, birth_date, gender, saju_json")
      .eq("user_id", userId).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();
    if (p) profile = p;

    // 결제 내역은 구독(subscriptions)과 단건 이용권(one_time_purchases) 양쪽에 나뉘어
    // 있다. 예전에는 구독만 조회해서, 990원 단건을 결제한 사람은 결제 내역이
    // 비어 보였다(실측: 990원 2건 결제했는데 "결제 내역이 없습니다").
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    for (const s of subs ?? []) {
      payments.push({ label: s.plan ?? "프리미엄 구독", status: s.status, created_at: s.created_at });
    }

    try {
      const { data: otp } = await supabaseAdmin
        .from("one_time_purchases")
        .select("product_id, amount, status, used_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      for (const o of otp ?? []) {
        const label = REPORT_PRODUCTS.find((r) => r.productId === o.product_id)?.label
          ?? (DESTINY_PRODUCT_IDS.includes(o.product_id) ? "운명 설계도" : o.product_id);
        payments.push({
          label,
          amount: o.amount,
          status: o.status === "canceled" ? "환불" : o.used_at ? "사용함" : "미사용",
          created_at: o.created_at,
        });
      }
    } catch { /* 테이블 없음 → 구독만 표시 */ }

    payments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    // 마이페이지 — 실제로 만들어 둔 리포트 목록. 어떤 걸 봤는지 여기서 바로 다시 열 수 있다.
    reports = await listUserReports(String(userId));

    const { data: u } = await supabaseAdmin
      .from("users").select("oauth_provider")
      .eq("id", userId).single();
    isEmailAccount = u?.oauth_provider === "email";
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-[#1B3A4B]">마이페이지</h1>
        <p className="text-sm text-[#6B6661] mt-0.5">내 사주 · 받은 리포트 · 결제 내역</p>
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

        {/* 받은 리포트 — 상품별로 테이블이 나뉘어 있어 여기서 한데 모아 보여준다 */}
        {loggedIn && (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <p className="text-sm font-semibold text-[#1B3A4B] mb-2">받은 리포트</p>
            {reports.length === 0 ? (
              <p className="text-sm text-[#6B6661]">아직 받은 리포트가 없어요</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {reports.map((r, i) => (
                  <li key={i}>
                    <a href={r.href} className="flex items-center justify-between py-1.5 active:opacity-60">
                      <span className="text-sm text-[#1A1A18]">{r.label}</span>
                      <span className="text-xs text-[#6B6661]">
                        {r.created_at.slice(0, 10)} <span className="text-[#C8743A]">보기 →</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-[#6B6661]/70 mt-2">생성된 결과는 1년간 다시 볼 수 있어요</p>
          </div>
        )}

        {/* 결제 내역 */}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#1B3A4B] mb-2">결제 내역</p>
          {payments.length === 0 ? (
            <p className="text-sm text-[#6B6661]">결제 내역이 없습니다</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {payments.map((pay, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-[#1A1A18]">
                    {pay.label}
                    {pay.amount != null && <span className="text-[#6B6661]"> · {pay.amount.toLocaleString()}원</span>}
                  </span>
                  <span className="text-[#6B6661]">
                    {pay.status === "active" ? "이용중"
                      : pay.status === "canceled" ? "해지"
                      : pay.status === "expired" ? "만료"
                      : pay.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-[#6B6661]/70 mt-2">
            환불 문의는 <a href="/contact?category=payment" className="underline">문의하기</a>로 남겨주세요.
          </p>
        </div>

        {/* 비밀번호 변경 (이메일 가입 계정만) */}
        {loggedIn && isEmailAccount && <ChangePasswordSection />}

        {/* 로그아웃 */}
        {loggedIn && (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl px-4">
            <LogoutButton />
          </div>
        )}

        {/* 계정 관리 (사주 정보 삭제 / 회원 탈퇴) */}
        {loggedIn && <DangerZone hasProfile={!!profile} />}
      </div>

      <BottomTabBar />
    </div>
  );
}
