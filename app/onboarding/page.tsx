import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { OnboardingClient, type ExistingProfile } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  let existingProfile: ExistingProfile = null;

  if (session?.user?.id) {
    const { data: p } = await supabaseAdmin
      .from("saju_profiles")
      .select("birth_date, gender, saju_json")
      .eq("user_id", session.user.id).eq("label", "본인")
      .order("created_at", { ascending: false }).limit(1).single();

    if (p?.saju_json) {
      const identity = (p.saju_json as { identity?: { day_master?: string; strength_label?: string } })?.identity;
      existingProfile = {
        day_master: identity?.day_master ?? "사주 등록됨",
        strength_label: identity?.strength_label ?? "",
        birth_date: p.birth_date,
        gender: p.gender,
      };
    }
  }

  return <OnboardingClient existingProfile={existingProfile} />;
}
