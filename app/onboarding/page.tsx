import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { listUserReports, type MyReport } from "@/lib/billing/my-reports";
import { OnboardingClient, type ExistingProfile } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  let existingProfile: ExistingProfile = null;
  // 재등록 경고 모달 재료 — "다시 등록"을 누르면 이 사용자가 지금까지 만든 리포트가
  // 마이페이지 목록에서 전부(어느 과거 profile_id로 만들었든) 사라진다.
  let reports: MyReport[] = [];

  if (session?.user?.id) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles")
      .select("birth_date, gender, saju_json, calendar, birth_date_confirmed_at")
      .eq("user_id", session.user.id).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();

    if (p?.saju_json) {
      const identity = (p.saju_json as { identity?: { day_master?: string; strength_label?: string } })?.identity;
      existingProfile = {
        day_master: identity?.day_master ?? "사주 등록됨",
        strength_label: identity?.strength_label ?? "",
        birth_date: p.birth_date,
        gender: p.gender,
        // §1 도입 전 저장분(음력이 양력 칸에 들어갔을 수 있음)만 확인 배너 대상.
        needsBirthDateConfirm: p.calendar === "solar" && !p.birth_date_confirmed_at,
      };
      reports = await listUserReports(session.user.id);
    }
  }

  return <OnboardingClient existingProfile={existingProfile} reports={reports} />;
}
