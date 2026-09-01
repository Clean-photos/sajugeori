-- 018: 전 유료 리포트 공통 "대상 사주 확정" — 1회성(비-본인) 대상 리포트 캐시.
--
-- 배경: 결제와 "누구 사주를 볼지"가 분리돼 있지 않아, 모든 유료 라우트가
--   .eq("label","본인").order(created_at desc).limit(1)
-- 로 **마지막에 등록한 사주**를 그대로 물려받았다. 가족 사주를 보려 해도 대상을
-- 바꿀 방법이 없었다(CEO 실테스트 재현, 2026-08-31).
--
-- 016(premium_saju_adhoc_reports)이 프리미엄 사주 1종에 대해 이미 같은 문제를
-- 풀어 뒀다 — "등록된 사주가 있는 사람이 다른 사주를 넣으면, 본인 프로필을
-- 덮어쓰지 않고 1회성으로 따로 캐시한다". 이 테이블은 그 패턴을 상품 전체로
-- 일반화한 것이다(016은 그대로 두고 신규 상품만 이쪽을 쓴다 — 기존 캐시 무회귀).
--
-- 왜 기존 리포트 테이블의 PK를 바꾸지 않았나:
-- premium_reports·premium_wuxing_reports·blueprint_reports 등은 saju_profile_id가
-- PRIMARY KEY라, 대상만 바꿔 재생성하면 **먼저 만든 리포트가 덮어써진다**(돈 낸
-- 리포트가 사라짐). 살아 있는 결제 경로의 PK를 바꾸는 건 위험이 커서, 본인 사주
-- 케이스는 기존 경로를 그대로 두고 비-본인 대상만 이 테이블로 분리한다.
--
-- variant: 상품별 추가 키. 같은 대상이라도 조건이 다르면 다른 리포트다.
--   연운세 = "2026", 택일 = "이사|2026-09-01|2026-12-31",
--   펫 = "dog|초코|2020|3|1", 궁합 = "1990-01-01|F|romance", 나머지 = ""
-- birth_time은 NULL 대신 ''(시각 모름)로 저장한다 — Postgres는 UNIQUE에서 NULL을
-- 서로 다른 값으로 취급해, NULL을 쓰면 같은 조건의 행이 중복 생성된다(016과 동일).

CREATE TABLE IF NOT EXISTS public.premium_adhoc_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL,
  birth_date  DATE NOT NULL,
  birth_time  TEXT NOT NULL DEFAULT '',
  gender      TEXT NOT NULL,
  variant     TEXT NOT NULL DEFAULT '',
  content     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, birth_date, birth_time, gender, variant)
);

CREATE INDEX IF NOT EXISTS idx_premium_adhoc_user
  ON public.premium_adhoc_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_adhoc_expires
  ON public.premium_adhoc_reports(expires_at) WHERE expires_at IS NOT NULL;

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
-- (없으면 service_role이 "permission denied for table"로 실패 → 캐시가 저장/조회 안 됨)
GRANT ALL ON public.premium_adhoc_reports TO service_role;
ALTER TABLE public.premium_adhoc_reports ENABLE ROW LEVEL SECURITY;
