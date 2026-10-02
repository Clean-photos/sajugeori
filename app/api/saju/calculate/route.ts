import { NextRequest, NextResponse } from "next/server";
import { runSajuEngine } from "@/lib/saju-engine";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { MAX_REGISTERED_PROFILES } from "@/lib/billing/profile-limits";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { birth_date, birth_time, calendar, gender, persist, label, mode } = body;

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

    // 9차 D(CoS+CEO 확정, 2026-10-02): "다른 사주 등록"이 내 사주를 통째로 교체하던 문제.
    // mode="other"는 이름(label)과 함께 본인이 아닌 사람의 사주를 **추가**만 한다 —
    // is_primary(내 사주)는 건드리지 않는다. 계정당 등록 상한은 30개.
    if (session?.user?.id && mode === "other") {
      const name = typeof label === "string" ? label.trim().slice(0, 20) : "";
      if (!name || name === "본인" || name === "대상") {
        return NextResponse.json({ error: "이름을 입력해 주세요(‘본인’·‘대상’은 쓸 수 없어요)." }, { status: 400 });
      }
      const { data: mine } = await supabaseAdmin
        .from("saju_profiles").select("id").eq("user_id", session.user.id).eq("kind", "person").eq("is_primary", true).maybeSingle();
      if (!mine) {
        return NextResponse.json({ error: "먼저 내 사주를 등록해 주세요." }, { status: 400 });
      }
      const { count } = await supabaseAdmin
        .from("saju_profiles").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("kind", "person")
        .or('is_primary.eq.true,label.not.in.("본인","대상")');
      if ((count ?? 0) >= MAX_REGISTERED_PROFILES) {
        return NextResponse.json({ error: `등록할 수 있는 사주는 최대 ${MAX_REGISTERED_PROFILES}개예요.` }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("saju_profiles").insert({
        user_id: session.user.id, label: name, kind: "person", is_primary: false,
        birth_date, birth_time: birth_time ?? null, calendar, gender,
        saju_raw: result.saju_raw, saju_json: result.saju_json, schema_version: 1,
        birth_date_confirmed_at: new Date().toISOString(),
      });
      if (error) {
        console.error("saju_profiles(other) insert error:", error);
        return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
      }
      return NextResponse.json({ saju_json: result.saju_json });
    }

    if (session?.user?.id) {
      // §[다중 사주 우선순위 확정, 2026-10-01, 마이그레이션 021]: 온보딩은
      // "본인" 하나만 다루는 화면이다 — 다시 등록하면 새 row가 본인 자리를
      // 이어받는다(기존 row는 지우지 않고 is_primary만 false로 내림, 그
      // row가 만든 과거 리포트는 saju_profile_id로 그대로 열람 가능).
      // "본인"은 유저당 kind='person' + is_primary=true 1건으로 유니크
      // 인덱스가 강제하므로, 새 row를 넣기 전에 기존 본인을 먼저 내려야 한다.
      await supabaseAdmin
        .from("saju_profiles")
        .update({ is_primary: false })
        .eq("user_id", session.user.id).eq("kind", "person").eq("is_primary", true);

      const { error } = await supabaseAdmin.from("saju_profiles").insert({
        user_id: session.user.id,
        label: label ?? "본인",
        kind: "person",
        is_primary: true,
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
