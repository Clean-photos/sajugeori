import { NextResponse } from "next/server";

// GET /api/saju/me
// Returns the authenticated user's saved saju_json
export async function GET() {
  // TODO: get session, query saju_profiles where user_id = session.user.id
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
