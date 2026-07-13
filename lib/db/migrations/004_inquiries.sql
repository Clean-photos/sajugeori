-- 문의 게시판 테이블. 로그인 이용자가 문의를 남기고 본인 문의 내역만 조회한다.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.

CREATE TABLE IF NOT EXISTS inquiries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL DEFAULT 'general',
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id, created_at DESC);

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
GRANT ALL ON inquiries TO service_role;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
