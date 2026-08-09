-- 012: 운명 설계도 v3.2(질문 24개·6블록 구조) 전용 캐시.
--
-- 스펙 9장 격리 조건: "기존 6종 리포트와 코드·스키마 공유 금지". 이전
-- 세션에서 만든 premium_destiny_reports(12영역 구조)는 그대로 남겨 두고
-- (혹시 남아있는 캐시가 있어도 깨지지 않도록), 새 24질문 구조는 이 테이블에
-- 별도로 쓴다. /premium/destiny 라우트가 이 테이블을 바라보도록 바뀐다 —
-- 판매 진입점(가격·업그레이드 자격 판정)은 이미 완성돼 있어 재사용하고,
-- 리포트 "내용물" 생성 엔진만 v3.2로 교체하는 구조다.

CREATE TABLE IF NOT EXISTS blueprint_reports (
  saju_profile_id UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  content         JSONB NOT NULL,   -- BlueprintReport 전체(총론·축4개·실행설계·조언5·차트·앵커)
  total_chars     INT,              -- 실측 글자수(스펙 9,000자 기준 모니터링용)
  grade_a_ratio   NUMERIC(4,3),     -- 근거강도 A 비율(스펙 40% 이하 기준 모니터링용)
  expires_at      TIMESTAMPTZ,      -- 010_report_expiry.sql과 동일한 1년 정책
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blueprint_reports_user ON blueprint_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_reports_expires ON blueprint_reports(expires_at) WHERE expires_at IS NOT NULL;

GRANT ALL ON blueprint_reports TO service_role;
ALTER TABLE blueprint_reports ENABLE ROW LEVEL SECURITY;
