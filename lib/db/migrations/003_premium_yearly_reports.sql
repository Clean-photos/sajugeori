-- 프리미엄 연운세 캐시 테이블 (연도별).
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.
-- 이 테이블이 없어도 앱은 동작하지만(매 조회 시 재생성), 있으면 (사주,연도)당 1회 생성 후 캐시됩니다.

CREATE TABLE IF NOT EXISTS premium_yearly_reports (
  saju_profile_id UUID REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  year            INT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (saju_profile_id, year)
);
CREATE INDEX IF NOT EXISTS idx_premium_yearly_user ON premium_yearly_reports(user_id);

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
-- (없으면 service_role이 "permission denied for table"로 실패 → 캐시가 저장/조회 안 됨)
GRANT ALL ON premium_yearly_reports TO service_role;
ALTER TABLE premium_yearly_reports ENABLE ROW LEVEL SECURITY;
