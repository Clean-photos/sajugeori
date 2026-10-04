import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** 로그인 확인. 로그인 안 했으면 라우트가 그대로 돌려줄 401 응답을 함께 준다. */
export async function requireUser(
  loginRedirect: string
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "login_required", redirect: `/login?redirect=${loginRedirect}` }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id };
}
