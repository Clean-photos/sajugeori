import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// 열람기간 1년이 지난 리포트를 실제로 삭제하는 배치. Vercel Cron이 매일 1회 호출한다
// (vercel.json 참고). 사용자 요청 경로(조회 시 만료 필터)와 분리해, 실제 삭제는
// 트래픽이 적을 때 한 번에 처리한다 — 이유는 010_report_expiry.sql 주석 참고.
//
// Vercel Cron은 요청에 `Authorization: Bearer ${CRON_SECRET}`을 자동으로 실어 보낸다.
// CRON_SECRET이 설정돼 있지 않으면(로컬 등) 검증을 건너뛴다.
export const maxDuration = 60;

const TABLES = [
  "premium_reports",
  "premium_yearly_reports",
  "premium_salpuri_reports",
  "premium_pet_reports",
  "premium_compatibility_reports",
  "premium_taekil_reports",
] as const;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const nowIso = new Date().toISOString();
  const results: Record<string, number | string> = {};

  for (const table of TABLES) {
    try {
      // 테이블마다 PK 컬럼명이 달라(id 없는 테이블도 있음) select 대신 count 옵션을 쓴다.
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .not("expires_at", "is", null)
        .lte("expires_at", nowIso);
      if (error) {
        results[table] = `error: ${error.message}`;
        continue;
      }
      results[table] = count ?? 0;
    } catch (e) {
      results[table] = `exception: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({ ok: true, purged: results, at: nowIso });
}
