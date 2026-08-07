-- 011: 운명 설계도(프리미엄 사주 확장판, 7,900원 직구매 / 6,900원 업그레이드) 캐시.
-- 기존 4종과 동일한 패턴. expires_at은 처음부터 넣는다(010의 1년 정책을 그대로 적용).

CREATE TABLE IF NOT EXISTS premium_destiny_reports (
  saju_profile_id UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  content         JSONB NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_premium_destiny_user ON premium_destiny_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_destiny_expires ON premium_destiny_reports(expires_at) WHERE expires_at IS NOT NULL;

GRANT ALL ON premium_destiny_reports TO service_role;
ALTER TABLE premium_destiny_reports ENABLE ROW LEVEL SECURITY;
