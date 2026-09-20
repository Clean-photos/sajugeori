import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { LogoutButton } from "./LogoutButton";
import { DangerZone } from "./DangerZone";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { REPORT_PRODUCTS, DESTINY_PRODUCT_IDS } from "@/lib/billing/plans";
import { listUserReports, viewHref, type MyReport } from "@/lib/billing/my-reports";
import { loadOwnProfile, type OwnProfile } from "@/lib/billing/report-target";
import { BirthDateConfirmBanner } from "@/components/BirthDateConfirmBanner";

export default async function MypagePage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  let profile: OwnProfile | null = null;
  let payments: { label: string; status: string; created_at: string; amount?: number }[] = [];
  let reports: MyReport[] = [];
  let isEmailAccount = false;

  if (loggedIn) {
    const userId = session!.user!.id!;

    // 2026-09-17(CoS 실물 확인: 삭제 후 마이페이지 리다이렉트가 7~10초 걸림):
    // 아래 5개(프로필·구독·단건결제·리포트 목록·계정 종류)가 전부 서로 무관한
    // 독립 쿼리인데 하나씩 순서대로 await되고 있었다 — 마이페이지가 서버
    // 컴포넌트라 이게 다 끝나야 페이지를 보낼 수 있어, "느린 리다이렉트"의
    // 실체는 router.push가 아니라 이 함수 자체였다. 동시에 실행한다.
    // 어느 조회가 느린지 프로덕션 로그에서 바로 보이도록 구간별 소요를 잰다(합계 1.5초 넘을 때만 출력).
    const t0 = Date.now();
    const spans: Record<string, number> = {};
    const timed = <T,>(label: string, p: PromiseLike<T>): Promise<T> =>
      Promise.resolve(p).then((v) => { spans[label] = Date.now() - t0; return v; });
    const [profileResult, subsResult, otpResult, reportsResult, userResult] = await Promise.all([
      timed("profile", loadOwnProfile(userId, { withDisplay: true })),
      timed("subs", supabaseAdmin
        .from("subscriptions")
        .select("plan, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })),
      timed("otp", (async () => {
        try {
          return await supabaseAdmin
            .from("one_time_purchases")
            .select("product_id, amount, status, used_at, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        } catch {
          return { data: null }; // 테이블 없음 → 구독만 표시
        }
      })()),
      timed("reports", listUserReports(String(userId))),
      timed("user", supabaseAdmin.from("users").select("oauth_provider").eq("id", userId).single()),
    ]);
    if (Date.now() - t0 > 1500) console.warn("[mypage_slow]", JSON.stringify(spans));

    profile = profileResult;

    // 결제 내역은 구독(subscriptions)과 단건 이용권(one_time_purchases) 양쪽에 나뉘어
    // 있다. 예전에는 구독만 조회해서, 990원 단건을 결제한 사람은 결제 내역이
    // 비어 보였다(실측: 990원 2건 결제했는데 "결제 내역이 없습니다").
    for (const s of subsResult.data ?? []) {
      payments.push({ label: s.plan ?? "프리미엄 구독", status: s.status, created_at: s.created_at });
    }
    for (const o of otpResult.data ?? []) {
      const label = REPORT_PRODUCTS.find((r) => r.productId === o.product_id)?.label
        ?? (DESTINY_PRODUCT_IDS.includes(o.product_id) ? "운명 설계도" : o.product_id);
      payments.push({
        label,
        amount: o.amount,
        status: o.status === "canceled" ? "환불" : o.used_at ? "사용함" : "미사용",
        created_at: o.created_at,
      });
    }
    payments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    // 마이페이지 — 실제로 만들어 둔 리포트 목록. 어떤 걸 봤는지 여기서 바로 다시 열 수 있다.
    reports = reportsResult;

    isEmailAccount = userResult.data?.oauth_provider === "email";
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
              {/* §1(양력·음력 선택) 도입 전 저장분만 대상 — 음력이 양력 칸에
                  들어갔을 수 있어 본인 확인을 유도한다(B안). */}
              {profile.calendar === "solar" && !profile.birth_date_confirmed_at && (
                <div className="mt-3">
                  <BirthDateConfirmBanner birthDate={profile.birth_date} />
                </div>
              )}
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
                    <a href={viewHref(r)} className="flex items-center justify-between py-1.5 active:opacity-60">
                      <span className="flex flex-col">
                        <span className="text-sm text-[#1A1A18]">{r.label}</span>
                        {/* §3(CEO 결정 2026-09-02): 같은 상품을 본인·가족 여러 명 몫으로
                            받았을 때 라벨만으론 구분이 안 됐다 — 대상 사주를 함께 표시. */}
                        {r.target && <span className="text-[11px] text-[#6B6661]/80 mt-0.5">{r.target}</span>}
                      </span>
                      <span className="text-xs text-[#6B6661] whitespace-nowrap">
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

      <BottomTabBar hasProfile={!!profile} />
    </div>
  );
}
