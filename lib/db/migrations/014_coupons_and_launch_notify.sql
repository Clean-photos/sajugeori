-- 014: (1) 결제 관련 테이블 FK 교정  (2) 오픈 알림 신청  (3) 쿠폰
--
-- ⚠️ (1)이 이 마이그레이션에서 가장 중요하다.
-- one_time_purchases(006)와 premium_generation_attempts(008)의 user_id가
-- auth.users(id)를 참조하도록 만들어져 있었다. 이 앱의 회원은 NextAuth로
-- public.users에 저장되고 auth.users는 쓰지 않으므로, 두 테이블은 지금까지
-- 단 한 행도 삽입되지 못했다(실측: 둘 다 0행, 실제 user_id로도 23503).
--   - one_time_purchases 실패 = 토스 결제 승인 후 "구매 기록 저장에 실패했습니다"
--     화면의 원인. 결제를 열면 모든 단건 구매가 이 경로를 탄다.
--   - premium_generation_attempts 실패 = 결제-생성 원자성 보호(중복 생성 차단,
--     입력값 보존, 재생성 멱등성)가 코드에는 있으나 조용히 무력화된 상태였다
--     (startAttempt가 실패를 삼키고 attemptId: null로 통과시킨다).
-- 두 테이블 모두 비어 있어 데이터 손실 없이 제약만 교체하면 된다.

ALTER TABLE public.one_time_purchases
  DROP CONSTRAINT IF EXISTS one_time_purchases_user_id_fkey;
ALTER TABLE public.one_time_purchases
  ADD CONSTRAINT one_time_purchases_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.premium_generation_attempts
  DROP CONSTRAINT IF EXISTS premium_generation_attempts_user_id_fkey;
ALTER TABLE public.premium_generation_attempts
  ADD CONSTRAINT premium_generation_attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- ─── 오픈 알림 신청 ─────────────────────────────────────────
-- 결제 오픈(9월 예정) 전까지 구매 의사를 가진 방문자를 리드로 회수한다.
-- 개인정보 최소 수집 원칙에 따라 이메일만 받는다. 로그인 상태면 user_id도 같이
-- 남겨 두어 나중에 쿠폰을 계정으로 바로 지급할 수 있게 한다.
CREATE TABLE IF NOT EXISTS public.launch_notify_subscribers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL UNIQUE,
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  coupon_code      TEXT,          -- 발급해 준 쿠폰 코드 (오픈 시점에 채운다)
  coupon_issued_at TIMESTAMPTZ,
  notified_at      TIMESTAMPTZ,   -- 오픈 알림 메일을 실제로 보낸 시각
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_launch_notify_created ON public.launch_notify_subscribers(created_at);

ALTER TABLE public.launch_notify_subscribers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.launch_notify_subscribers TO service_role;


-- ─── 쿠폰 ──────────────────────────────────────────────────
-- kind='free_report': 990원 리포트 1종을 무료로 열람할 수 있는 쿠폰.
-- product_id가 NULL이면 990원 6종 중 아무거나, 값이 있으면 그 상품 전용.
CREATE TABLE IF NOT EXISTS public.coupons (
  code        TEXT PRIMARY KEY,
  kind        TEXT NOT NULL DEFAULT 'free_report',
  product_id  TEXT,
  max_uses    INT  NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count  INT  NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 같은 쿠폰을 같은 사람이 두 번 쓰지 못하게 (code, user_id) UNIQUE.
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL REFERENCES public.coupons(code) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, user_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.coupons TO service_role;
GRANT ALL ON TABLE public.coupon_redemptions TO service_role;


-- 쿠폰 사용을 한 트랜잭션으로 처리한다. supabase-js에는 트랜잭션이 없어서,
-- 검증 → 사용기록 → 카운트 증가 → 이용권 발급을 앱에서 나눠 하면 중간에
-- 끊겼을 때 쿠폰만 소모되거나 이용권만 발급되는 상태가 남는다.
-- SELECT ... FOR UPDATE로 해당 쿠폰 행을 잠가 동시 요청도 직렬화한다.
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_code       TEXT,
  p_user_id    UUID,
  p_product_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.coupons
   WHERE code = upper(btrim(p_code))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;
  IF c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;
  IF c.product_id IS NOT NULL AND c.product_id <> p_product_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_product');
  END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions
              WHERE code = c.code AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  INSERT INTO public.coupon_redemptions (code, user_id, product_id)
  VALUES (c.code, p_user_id, p_product_id);

  UPDATE public.coupons SET used_count = used_count + 1 WHERE code = c.code;

  -- 쿠폰으로 받은 이용권은 결제와 동일한 경로(one_time_purchases)로 소진된다.
  -- amount 0, order_id에 쿠폰 코드를 남겨 정산·대사 때 결제분과 구분한다.
  INSERT INTO public.one_time_purchases (user_id, product_id, amount, order_id)
  VALUES (p_user_id, p_product_id, 0, 'coupon_' || c.code || '_' || p_user_id::TEXT);

  RETURN jsonb_build_object('ok', true, 'product_id', p_product_id);
END;
$fn$;

REVOKE ALL ON FUNCTION public.redeem_coupon(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID, TEXT) TO service_role;
