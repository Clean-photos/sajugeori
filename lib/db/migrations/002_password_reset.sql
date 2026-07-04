-- 비밀번호 재설정 토큰 테이블.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

GRANT ALL ON password_reset_tokens TO service_role;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
