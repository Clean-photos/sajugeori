-- subscriptions에 Toss 결제 참조 컬럼 추가.
-- webhook이 환불/취소 이벤트를 받았을 때 어떤 구독 행인지 찾기 위해 필요.
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_key TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_key ON subscriptions(payment_key);
