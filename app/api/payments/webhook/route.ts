import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/webhook
// Toss subscription status webhooks
export async function POST(req: NextRequest) {
  // TODO: verify webhook signature, handle subscription events
  return NextResponse.json({ received: true });
}
