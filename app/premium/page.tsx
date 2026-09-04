import type { Metadata } from "next";
import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { isPremiumUser, findUnusedOneTimePass } from "@/lib/billing/access";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { ONE_REPORT_PRICE } from "@/lib/billing/plans";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { SampleStickyCta } from "./SampleStickyCta";
import { SamplePreview } from "@/components/premium/SamplePreview";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { PremiumReport } from "./PremiumReport";

export const metadata: Metadata = {
  title: "프리미엄 사주 — 실제 계산 데이터로 깊이 있게 | 사주거리",
  description:
    "일간·오행·용신·대운까지 실제로 계산한 데이터를 근거로 성격·직업·재물·연애·건강·인생 패턴을 깊이 있게 풀이하는 프리미엄 사주 리포트입니다.",
  alternates: { canonical: "/premium" },
};

export default async function PremiumPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const loggedIn = !!userId;
  const premium = userId ? await isPremiumUser(userId) : false;

  // 헤더에 실제 일주·강약 표시
  let subtitle = "내 사주 풀이";
  let hasProfile = false;
  let hasReport = false;   // 이미 생성해 둔 풀이(이용권 소진 후 재열람용)
  // 입력 폼의 "입력된 사주 사용" 버튼에 쓸 요약
  let savedSaju: { birth_date: string; birth_time: string | null; gender: string } | null = null;
  if (userId) {
    const p = await loadOwnProfile(userId, { withDisplay: true });
    if (p?.birth_date) {
      savedSaju = { birth_date: p.birth_date, birth_time: p.birth_time ?? null, gender: p.gender };
    }
    if (p?.id) {
      try {
        const { count } = await supabaseAdmin
          .from("premium_reports").select("saju_profile_id", { count: "exact", head: true })
          .eq("saju_profile_id", p.id);
        hasReport = (count ?? 0) > 0;
      } catch { /* 테이블 없음 → 미보유로 간주 */ }
    }
    if (p?.saju_json?.identity) {
      hasProfile = true;
      const dm = p.saju_json.identity.day_master ?? "";
      const st = p.saju_json.identity.strength_label ?? "";
      subtitle = [dm && `${dm}일간`, st].filter(Boolean).join(" · ") || subtitle;
    }
  }

  // 구독자 · 미사용 이용권 보유자 · 이미 리포트를 받은 사람은 바로 열람.
  // 최종 권한 판정과 이용권 소진은 API(/api/premium/report)가 하고, 여기서는 화면 분기만 한다.
  const hasPass = !premium && userId ? (await findUnusedOneTimePass(userId, "saju_one")) !== null : false;
  const canView = premium || hasPass || hasReport;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#F6F1E7]">
      {/* §4: 4,000px 넘는 샘플을 읽다 결제/로그인으로 갔다 뒤로가기로 돌아오면
          스크롤이 맨 위로 리셋되던 문제 — sessionStorage로 위치를 복원한다. */}
      <ScrollRestoration />
      {/* 헤더는 화면에 실제로 무엇이 떠 있는지에 맞춘다.
          예전에는 상태와 무관하게 "내 사주 풀이 · (로그인 사용자의 일간·강약)"을
          띄웠는데, 미결제 상태에서 본문은 샘플(1978년생 여성)이라 헤더와 본문이
          서로 다른 사주를 가리켰다 — 사주를 아는 사람은 바로 이상함을 느낀다.
          결제 후 자기 리포트를 볼 때는 기존 표기가 맞으므로 그대로 둔다. */}
      <header className="px-5 pt-6 pb-4 bg-[#1B3A4B] text-white">
        {/* 이 화면까지 온 경로가 메뉴뿐인데 돌아갈 링크가 없었다. */}
        <Link href="/premium/menu" className="inline-flex items-center gap-1.5 text-xs opacity-70 mb-2 w-fit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          프리미엄
        </Link>
        <p className="text-xs opacity-70 mb-1">프리미엄 사주</p>
        {canView ? (
          <>
            <h1 className="text-xl font-bold">내 사주 풀이</h1>
            <p className="text-xs opacity-60 mt-1">{subtitle}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">프리미엄 사주는 이렇게 나옵니다</h1>
            <p className="text-xs opacity-60 mt-1">
              예시 · 1978년생 여성 / 회원님 결과는 다르게 계산됩니다
            </p>
          </>
        )}
      </header>

      {canView ? (
        // 사주가 없어도 다른 페이지로 보내지 않는다 — 리포트 화면에서 바로 입력받는다.
        <PremiumReport hasProfile={hasProfile} saved={savedSaju} />
      ) : (
        <>
          <div className="px-4 pt-4">
            <Link
              href={loggedIn ? "/premium/buy?product=saju_one" : "/login?redirect=/premium"}
              className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
            >
              <p className="text-sm font-semibold">전체 풀이 열람하기</p>
              <p className="text-xs opacity-80 mt-0.5">
                {ONE_REPORT_PRICE.toLocaleString()}원 · 1회 결제
              </p>
            </Link>
          </div>

          <div className="px-4 pt-3 pb-4">
            <SamplePreview sample={SAMPLE_REPORTS.saju} loggedIn={loggedIn} />
          </div>

          {/* 샘플을 끝까지 읽고 사고 싶어진 사람이 맨 위로 되돌아가지 않도록,
              같은 CTA를 샘플 끝에도 둔다. */}
          <div className="px-4 pb-2">
            <Link
              href={loggedIn ? "/premium/buy?product=saju_one" : "/login?redirect=/premium"}
              className="block rounded-2xl bg-[#C8743A] text-white px-5 py-4 text-center"
            >
              <p className="text-sm font-semibold">전체 풀이 열람하기</p>
              <p className="text-xs opacity-80 mt-0.5">
                {ONE_REPORT_PRICE.toLocaleString()}원 · 1회 결제
              </p>
            </Link>
          </div>

          <SampleStickyCta
            href={loggedIn ? "/premium/buy?product=saju_one" : "/login?redirect=/premium"}
            price={ONE_REPORT_PRICE}
          />
        </>
      )}

      <BottomTabBar hasProfile={hasProfile} />
    </div>
  );
}
