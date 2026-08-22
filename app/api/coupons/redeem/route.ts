import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { REPORT_PRODUCTS } from "@/lib/billing/plans";

const REASON_MESSAGE: Record<string, string> = {
  not_found: "존재하지 않는 쿠폰 코드입니다.",
  expired: "사용 기간이 지난 쿠폰입니다.",
  exhausted: "이미 모두 사용된 쿠폰입니다.",
  wrong_product: "이 리포트에는 사용할 수 없는 쿠폰입니다.",
  already_used: "이미 사용하신 쿠폰입니다.",
};

// POST /api/coupons/redeem — { code, productId }
// 쿠폰을 이용권(one_time_purchases)으로 바꿔 준다. 검증·차감·발급은 DB 함수
// redeem_coupon 안에서 한 트랜잭션으로 처리된다(중복 사용·동시 요청 차단).
// 결제 오픈 여부와 무관하게 동작한다 — 쿠폰은 결제창을 타지 않는다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const productId = typeof body.productId === "string" ? body.productId : "";

  if (!code) {
    return NextResponse.json({ error: "쿠폰 코드를 입력해주세요." }, { status: 400 });
  }
  // 쿠폰은 990원 리포트 6종에만 쓸 수 있다(운명 설계도 7,900원은 대상 아님).
  if (!REPORT_PRODUCTS.some((p) => p.productId === productId)) {
    return NextResponse.json({ error: "이 상품에는 쿠폰을 사용할 수 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("redeem_coupon", {
    p_code: code,
    p_user_id: session.user.id,
    p_product_id: productId,
  });

  if (error) {
    console.error("coupon redeem error:", error);
    return NextResponse.json({ error: "쿠폰 확인 중 오류가 발생했습니다." }, { status: 500 });
  }

  const result = data as { ok?: boolean; reason?: string } | null;
  if (!result?.ok) {
    const reason = result?.reason ?? "not_found";
    return NextResponse.json({ error: REASON_MESSAGE[reason] ?? "사용할 수 없는 쿠폰입니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, productId });
}
