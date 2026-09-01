-- 017: 오행 보완 리포트(wuxing_one, 990원) 캐시 테이블.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.
-- 이 테이블이 없어도 앱은 동작하지만(매 조회 시 재생성 시도), 있으면 사주 프로필당
-- 1회 생성 후 캐시된다. 010_report_expiry.sql이 이미 세운 1년 보관 정책을 신규
-- 테이블부터 바로 적용한다(expires_at을 nullable 아닌 채로 처음부터 포함).

CREATE TABLE IF NOT EXISTS premium_wuxing_reports (
  saju_profile_id UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  content         JSONB NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_premium_wuxing_user ON premium_wuxing_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_wuxing_reports_expires ON premium_wuxing_reports(expires_at) WHERE expires_at IS NOT NULL;

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
-- (없으면 service_role이 "permission denied for table"로 실패 → 캐시가 저장/조회 안 됨)
GRANT ALL ON premium_wuxing_reports TO service_role;
ALTER TABLE premium_wuxing_reports ENABLE ROW LEVEL SECURITY;
