-- 013: 이메일 인증
--
-- 지금까지는 이메일 가입 시 실존 여부를 전혀 확인하지 않아 아무 도메인의
-- 이메일로도 가입이 됐다. 인증 토큰 테이블을 추가하고(비밀번호 재설정과
-- 동일 패턴), users에 인증 시각을 기록한다. NULL이면 미인증.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

GRANT ALL ON email_verification_tokens TO service_role;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
