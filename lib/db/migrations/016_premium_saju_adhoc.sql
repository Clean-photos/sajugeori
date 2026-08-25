-- 016: 프리미엄 사주 1회성 조회 캐시
--
-- 결제 후 "먼저 사주를 등록하세요"로 막던 흐름을 없애고, 리포트 화면에서 바로
-- 사주를 입력할 수 있게 한다. 규칙은 이렇다.
--   - 등록된 사주가 없던 사람: 입력값을 본인 프로필로 저장한다(기존 온보딩과 동일).
--     이후 리포트는 지금까지처럼 premium_reports(saju_profile_id 기준)에 캐시된다.
--   - 등록된 사주가 이미 있는 사람: 입력값을 1회성으로 본다. 본인 프로필을 덮어쓰지
--     않고, 그 사주로 만든 리포트를 이 테이블에 따로 캐시한다.
--
-- birth_time은 NULL 대신 ''(시각 모름)로 저장한다. Postgres는 UNIQUE에서 NULL을
-- 서로 다른 값으로 취급해, NULL을 쓰면 같은 조건의 행이 중복 생성될 수 있다.

CREATE TABLE IF NOT EXISTS public.premium_saju_adhoc_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  birth_date  DATE NOT NULL,
  birth_time  TEXT NOT NULL DEFAULT '',
  gender      TEXT NOT NULL,
  content     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, birth_date, birth_time, gender)
);

CREATE INDEX IF NOT EXISTS idx_premium_saju_adhoc_user
  ON public.premium_saju_adhoc_reports (user_id);

ALTER TABLE public.premium_saju_adhoc_reports ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.premium_saju_adhoc_reports TO service_role;
