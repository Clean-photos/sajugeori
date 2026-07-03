-- Saju Street — PostgreSQL / Supabase schema
-- Run via: supabase db push  or  psql -f schema.sql

-- ─── Users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oauth_provider  TEXT NOT NULL,
  oauth_sub       TEXT NOT NULL,
  email           TEXT,
  display_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oauth_provider, oauth_sub)
);

-- ─── Saju Profiles (canonical IP) ────────────────────────
CREATE TABLE IF NOT EXISTS saju_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT DEFAULT '본인',
  birth_date      DATE NOT NULL,
  birth_time      TIME,                       -- NULL = 시간 모름
  calendar        TEXT NOT NULL CHECK (calendar IN ('solar','lunar')),
  gender          CHAR(1) NOT NULL CHECK (gender IN ('M','F')),
  longitude       NUMERIC,
  saju_raw        JSONB NOT NULL,             -- Layer A (internal only)
  saju_json       JSONB NOT NULL,             -- Layer B (canonical, AI-consumed)
  schema_version  INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saju_profiles_user ON saju_profiles(user_id);

-- ─── Characters ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  tagline         TEXT,
  avatar_url      TEXT,
  prompt_params   JSONB NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0
);

-- ─── Conversations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id    TEXT REFERENCES characters(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, character_id)
);

-- ─── Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  token_count     INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);

-- ─── User Memory (structured, shared across characters) ───
CREATE TABLE IF NOT EXISTS user_memory (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  memory          JSONB NOT NULL DEFAULT '{
    "career":      {"facts":[],"concerns":[],"goals":[]},
    "love":        {"facts":[],"concerns":[],"goals":[]},
    "family":      {"facts":[],"concerns":[],"goals":[]},
    "finance":     {"facts":[],"concerns":[],"goals":[]},
    "personality": {"traits":[]}
  }',
  people          JSONB NOT NULL DEFAULT '[]',
  events          JSONB NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Subscriptions ────────────────────────────────────────
-- NOTE: 실제 배포 DB 컬럼과 일치시킴. 구독 만료 시각은 expires_at 사용.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  status                TEXT NOT NULL CHECK (status IN ('active','canceled','expired')),
  plan                  TEXT,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ─── Premium Reports (프리미엄 사주 풀이 캐시) ────────────
CREATE TABLE IF NOT EXISTS premium_reports (
  saju_profile_id UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  content         JSONB NOT NULL,   -- { personality, career, money, love, health, life_pattern, current_phase, yearly }
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_premium_reports_user ON premium_reports(user_id);

-- ─── Ad Tokens (1-use reward verification) ────────────────
CREATE TABLE IF NOT EXISTS ad_tokens (
  token           TEXT PRIMARY KEY,
  user_key        TEXT NOT NULL,
  used            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS Policies ─────────────────────────────────────────
ALTER TABLE saju_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their saju_profiles"
  ON saju_profiles FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users own their memory"
  ON user_memory FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users see their conversations"
  ON conversations FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users see their messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
