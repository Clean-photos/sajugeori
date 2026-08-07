-- 009: 궁합·택일 리포트 캐시 (기존 4종 — premium_reports, premium_yearly_reports,
-- premium_salpuri_reports, premium_pet_reports — 패턴 준용)
--
-- 이 두 리포트만 캐시 테이블이 없어 페이지를 벗어나면 결과가 사라지고,
-- 990원 이용권이 이미 소진된 뒤 재요청하면 402로 막히는 상태였다.
-- "6종 전부 재열람 무료" 공지와 어긋나므로 결제 활성화 전에 해소한다.
--
-- 같은 사람이 여러 상대·여러 기간을 조회할 수 있어 saju_profile_id 하나만으로는
-- 키가 부족하다. 조회 조건 전체를 UNIQUE로 묶어 같은 조건이면 캐시를 재사용한다.

CREATE TABLE IF NOT EXISTS premium_compatibility_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saju_profile_id UUID REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  partner_birth   TEXT NOT NULL,
  partner_gender  TEXT NOT NULL,
  context         TEXT NOT NULL,
  score           INT,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (saju_profile_id, partner_birth, partner_gender, context)
);
CREATE INDEX IF NOT EXISTS idx_premium_compat_user ON premium_compatibility_reports(user_id);

CREATE TABLE IF NOT EXISTS premium_taekil_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saju_profile_id UUID REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  purpose         TEXT NOT NULL,
  range_from      DATE NOT NULL,
  range_to        DATE NOT NULL,
  content         TEXT NOT NULL,
  best            JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (saju_profile_id, purpose, range_from, range_to)
);
CREATE INDEX IF NOT EXISTS idx_premium_taekil_user ON premium_taekil_reports(user_id);

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
GRANT ALL ON premium_compatibility_reports TO service_role;
GRANT ALL ON premium_taekil_reports TO service_role;
ALTER TABLE premium_compatibility_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_taekil_reports ENABLE ROW LEVEL SECURITY;
