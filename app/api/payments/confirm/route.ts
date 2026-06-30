import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/confirm
// Toss Payments approval callback
export async function POST(req: NextRequest) {
  // TODO: verify toss payment, update subscriptions table
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
