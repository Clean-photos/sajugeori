import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

export default async function CharacterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?redirect=/street");
  }

  const { data: profile } = await supabaseAdmin
    .from("saju_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("label", "본인")
    .limit(1)
    .single();

  if (!profile) {
    redirect("/onboarding?from=street");
  }

  return <>{children}</>;
}
