-- 살풀이 · 반려동물 궁합 리포트 캐시.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.
--
-- 없어도 앱은 동작하지만(매 조회 시 재생성), 있으면 같은 조건의 리포트를 1회만 생성합니다.
-- 비용 방어와 함께, 990원 이용권으로 살풀이를 본 사용자가 결과를 다시 열람할 수 있게 해 줍니다
-- (캐시가 없으면 이용권이 이미 소진되어 재열람이 막힘).

-- ── 살풀이: 사주가 같으면 신살도 같으므로 프로필당 1건 ──────────────
CREATE TABLE IF NOT EXISTS premium_salpuri_reports (
  saju_profile_id UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_premium_salpuri_user ON premium_salpuri_reports(user_id);

-- ── 반려동물 궁합: 한 사람이 여러 아이를 볼 수 있으므로 아이 정보까지 키에 포함 ──
-- pet_day는 모를 수 있어 0을 '모름'으로 쓴다(PK/UNIQUE 컬럼은 NULL을 허용하지 않으므로).
CREATE TABLE IF NOT EXISTS premium_pet_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saju_profile_id UUID REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  species         TEXT NOT NULL,
  pet_name        TEXT NOT NULL DEFAULT '',
  pet_year        INT  NOT NULL,
  pet_month       INT  NOT NULL,
  pet_day         INT  NOT NULL DEFAULT 0,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (saju_profile_id, species, pet_name, pet_year, pet_month, pet_day)
);
CREATE INDEX IF NOT EXISTS idx_premium_pet_user ON premium_pet_reports(user_id);

-- SQL Editor로 만든 테이블은 API 롤에 권한이 자동 부여되지 않으므로 명시적으로 GRANT.
-- (없으면 service_role이 "permission denied for table"로 실패 → 캐시가 저장/조회 안 됨)
GRANT ALL ON premium_salpuri_reports TO service_role;
GRANT ALL ON premium_pet_reports     TO service_role;
ALTER TABLE premium_salpuri_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_pet_reports     ENABLE ROW LEVEL SECURITY;
