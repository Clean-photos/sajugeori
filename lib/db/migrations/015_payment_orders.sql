-- 015: 결제 주문 사전 기록 (payment_orders)
--
-- 지금까지 orderId는 BuyClient에서 즉석 생성해 토스로 바로 넘겼고 서버에는
-- 아무 기록도 남지 않았다. 그래서 문제가 두 가지 있었다.
--
-- 1) 웹훅으로 복구가 불가능하다. 토스가 결제 상태 변경을 알려줘도 그 orderId가
--    누구의 어떤 상품 주문인지 우리 쪽에서 알 방법이 없어, 리다이렉트가
--    유실된 결제를 사후에 살릴 수 없었다.
-- 2) 중복 결제를 막을 근거가 없다. 뒤로가기 후 재시도하면 매번 새 orderId가
--    만들어져 같은 상품을 두 번 결제해도 서버는 구분하지 못한다.
--
-- 결제창을 열기 전에 이 테이블에 pending 주문을 먼저 남기고, 승인(confirm)
-- 또는 웹훅에서 그 행을 done으로 바꾼다. 금액·상품도 서버가 정한 값을 쓰므로
-- 클라이언트가 보낸 금액을 신뢰할 필요가 없어진다.

CREATE TABLE IF NOT EXISTS public.payment_orders (
  order_id    TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id     TEXT NOT NULL,
  amount      INT  NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | done | canceled
  payment_key TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_status
  ON public.payment_orders (user_id, plan_id, status);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.payment_orders TO service_role;
