import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { getPlan, REPORT_PRODUCTS, DESTINY_PRODUCT_IDS } from "@/lib/billing/plans";
import { findUnusedOneTimePass, findUnusedDestinyPass, isPremiumUser } from "@/lib/billing/access";

// POST /api/payments/prepare — { planId }
// 결제창을 열기 전에 주문을 서버에 먼저 남긴다. 금액·상품명은 서버가 정한 값을
// 돌려주므로 클라이언트가 임의로 바꿔 보낼 여지가 없다.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const planId = typeof body.planId === "string" ? body.planId : "";
  const plan = getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "알 수 없는 상품입니다." }, { status: 400 });
  }

  // 이미 쓸 수 있는 이용권이 있는데 또 결제하려는 경우를 막는다 (뒤로가기 재시도,
  // 결제 버튼 연타 후 새 orderId 발급 등으로 인한 이중 결제 방지).
  const isDestiny = DESTINY_PRODUCT_IDS.includes(plan.id);
  const isReport = REPORT_PRODUCTS.some((p) => p.productId === plan.id);
  if (isDestiny || isReport) {
    if (await isPremiumUser(userId)) {
      return NextResponse.json(
        { error: "이미 프리미엄 이용 중이라 추가 결제 없이 보실 수 있어요." },
        { status: 409 }
      );
    }
    const existing = isDestiny
      ? await findUnusedDestinyPass(userId)
      : await findUnusedOneTimePass(userId, plan.id);
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용하지 않은 이용권이 있어요. 결제 없이 바로 보실 수 있습니다." },
        { status: 409 }
      );
    }
  }

  const orderId = `order_${Date.now()}_${randomBytes(5).toString("hex")}`;

  const { error } = await supabaseAdmin.from("payment_orders").insert({
    order_id: orderId,
    user_id: userId,
    plan_id: plan.id,
    amount: plan.amount,
    status: "pending",
  });

  if (error) {
    console.error("payment prepare insert error:", error);
    return NextResponse.json({ error: "결제를 시작할 수 없습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return NextResponse.json({ orderId, amount: plan.amount, orderName: plan.name });
}
