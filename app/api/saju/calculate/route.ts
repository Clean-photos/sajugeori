import { NextRequest, NextResponse } from "next/server";
import { runSajuEngine } from "@/lib/saju-engine";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { birth_date, birth_time, calendar, gender, persist, label } = body;

  if (!birth_date || !gender || !calendar) {
    return NextResponse.json({ error: "birth_date, gender, calendar are required" }, { status: 400 });
  }
  if (!["M", "F"].includes(gender)) {
    return NextResponse.json({ error: "gender must be M or F" }, { status: 400 });
  }

  let result: ReturnType<typeof runSajuEngine>;
  try {
    result = runSajuEngine({ birth_date, birth_time: birth_time ?? null, calendar, gender });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Engine error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (persist) {
    const session = await auth();
    if (session?.user?.id) {
      const { error } = await supabaseAdmin.from("saju_profiles").insert({
        user_id: session.user.id,
        label: label ?? "본인",
        birth_date,
        birth_time: birth_time ?? null,
        calendar,
        gender,
        saju_raw: result.saju_raw,
        saju_json: result.saju_json,
        schema_version: 1,
      });
      if (error) console.error("saju_profiles insert error:", error);
    }
  }

  return NextResponse.json({ saju_json: result.saju_json });
}
