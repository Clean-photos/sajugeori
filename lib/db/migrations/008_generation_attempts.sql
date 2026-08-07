-- 008: 리포트 생성 시도 추적 (결제-생성 원자성)
--
-- "결제됐는데 결과가 없다"를 구조적으로 막기 위한 테이블.
-- 생성 요청이 들어오는 시점에 입력값(input)을 먼저 저장해 두므로, LLM 호출이
-- 실패해도 사용자가 생년월일·상대 정보 등을 다시 입력할 필요가 없다. 같은
-- attempt id로 재요청하면 저장된 input을 그대로 재사용해 재생성한다.
--
-- status='pending'에 대해서만 (user_id, product_id) UNIQUE를 걸어, 같은
-- 사용자가 같은 상품을 동시에 두 번 눌러도(더블클릭 레이스) 두 번째 요청은
-- 즉시 409로 막힌다 — 이용권 이중 소진·이중 LLM 호출을 방지한다.
--
-- 이 테이블이 없어도 앱은 동작한다(각 라우트가 조회 실패를 조용히 무시하고
-- 잠금 없이 진행). 있으면 위 보호가 활성화된다.

CREATE TABLE IF NOT EXISTS public.premium_generation_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  input         JSONB,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | done | failed
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pga_user_product ON public.premium_generation_attempts(user_id, product_id);

-- status='pending'인 행은 (user_id, product_id)당 최대 1개만 허용 → 동시 중복 생성 차단
CREATE UNIQUE INDEX IF NOT EXISTS uq_pga_pending ON public.premium_generation_attempts(user_id, product_id)
  WHERE status = 'pending';

ALTER TABLE public.premium_generation_attempts ENABLE ROW LEVEL SECURITY;

-- 서버(서비스 롤)만 접근. 클라이언트 직접 접근 없음.
GRANT ALL ON TABLE public.premium_generation_attempts TO service_role;
