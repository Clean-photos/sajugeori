import { NextRequest, NextResponse } from "next/server";

// POST /api/premium/report
// Requires active subscription
export async function POST(req: NextRequest) {
  // TODO: verify session + subscription status
  // TODO: load saju_json from DB
  // TODO: call LLM with full premium prompt
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
