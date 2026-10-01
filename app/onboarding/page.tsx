import { auth } from "@/lib/auth";
import { listUserReports, type MyReport } from "@/lib/billing/my-reports";
import { loadOwnProfile } from "@/lib/billing/report-target";
import { OnboardingClient, type ExistingProfile } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  let existingProfile: ExistingProfile = null;
  // "이미 등록된 사주" 화면에서 "지금까지 만든 리포트 N건은 계속 볼 수 있다"는
  // 안내에 쓴다(재등록해도 지워지지 않는다 — ReregisterWarningModal 삭제 참고).
  let reports: MyReport[] = [];

  if (session?.user?.id) {
    const p = await loadOwnProfile(session.user.id, { withDisplay: true });

    if (p?.saju_json) {
      const identity = p.saju_json.identity;
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
