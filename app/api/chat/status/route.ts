import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPremiumUser, countUserChatMessages, FREE_CHAT_MESSAGE_LIMIT } from "@/lib/billing/access";

// GET /api/chat/status — 채팅 무료 체험 잔여 개수/프리미엄 여부
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ loggedIn: false });
  }
  const userId = session.user.id;
  const premium = await isPremiumUser(userId);
  if (premium) {
    return NextResponse.json({ loggedIn: true, premium: true });
  }
  const used = await countUserChatMessages(userId);
  const remaining = Math.max(0, FREE_CHAT_MESSAGE_LIMIT - used);
  return NextResponse.json({
    loggedIn: true,
    premium: false,
    limit: FREE_CHAT_MESSAGE_LIMIT,
    used,
    remaining,
  });
}
