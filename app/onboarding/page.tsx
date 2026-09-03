import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { OnboardingClient, type ExistingProfile } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  let existingProfile: ExistingProfile = null;

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
    }
  }

  return <OnboardingClient existingProfile={existingProfile} />;
}
