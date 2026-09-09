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
        // §13(CoS+CEO 실물 확인, 2026-09-08): birth_date_confirmed_at이 비어
        // 있으면 "예전엔 음력 선택지가 없어 잘못 입력했을 수 있다"는 배너를
        // 띄우는데(마이그레이션 019), 이 라우트는 온보딩의 역법 선택 UI를
        // 거쳐야만 도달한다 — 즉 이 시점에 생기는 행은 전부 신규(역법을 이미
        // 직접 골랐음)이지 그 배너가 가리키는 "레거시" 행이 아니다. 등록
        // 즉시 확인 완료로 찍어 오늘 가입한 사람에게 그 배너가 새지 않게 한다.
        birth_date_confirmed_at: new Date().toISOString(),
      });
      if (error) console.error("saju_profiles insert error:", error);
    }
  }

  return NextResponse.json({ saju_json: result.saju_json });
}
