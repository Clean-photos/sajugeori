import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";

const CATEGORIES = ["general", "bug", "payment", "account", "suggestion"];

// GET /api/inquiries — 로그인 이용자 본인의 문의 내역만 반환.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  try {
    const { data } = await supabaseAdmin
      .from("inquiries")
      .select("id, category, subject, message, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return NextResponse.json({ inquiries: data ?? [] });
  } catch {
    // 테이블 미생성 시에도 화면은 동작하도록 빈 목록 반환
    return NextResponse.json({ inquiries: [] });
  }
}

// POST /api/inquiries — 로그인 이용자가 문의 등록.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = await req.json();
  const category = CATEGORIES.includes(body.category) ? body.category : "general";
  const subject = (body.subject ?? "").toString().trim().slice(0, 100);
  const message = (body.message ?? "").toString().trim().slice(0, 2000);

  if (subject.length < 2 || message.length < 5) {
    return NextResponse.json({ error: "제목과 내용을 조금 더 입력해주세요." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .insert({ user_id: session.user.id, category, subject, message })
      .select("id, category, subject, message, status, created_at")
      .single();
    if (error) {
      console.error("inquiry insert error:", error);
      return NextResponse.json({ error: "문의 등록에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
    return NextResponse.json({ inquiry: data });
  } catch (e) {
    console.error("inquiry error:", e);
    return NextResponse.json({ error: "문의 등록에 실패했습니다." }, { status: 500 });
  }
}
