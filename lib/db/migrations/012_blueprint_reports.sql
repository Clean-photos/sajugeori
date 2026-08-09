-- 012: 운명 설계도 v3.2(질문 24개·6블록 구조) 전용 캐시.
--
-- 스펙 9장 격리 조건: "기존 6종 리포트와 코드·스키마 공유 금지". 이전
-- 세션에서 만든 premium_destiny_reports(12영역 구조)는 그대로 남겨 두고
-- (혹시 남아있는 캐시가 있어도 깨지지 않도록), 새 24질문 구조는 이 테이블에
-- 별도로 쓴다. /premium/destiny 라우트가 이 테이블을 바라보도록 바뀐다 —
-- 판매 진입점(가격·업그레이드 자격 판정)은 이미 완성돼 있어 재사용하고,
-- 리포트 "내용물" 생성 엔진만 v3.2로 교체하는 구조다.
--
-- 187초 단일 요청은 위험하다는 지적에 따라(탭 이탈 시 결과 유실, 타임아웃
-- 재시도로 이중생성) 축 단위(총론+축4개) 병렬 호출이 끝나는 대로 즉시
-- 부분 저장하는 구조로 바꿨다 — status/content/parts_done/parts_failed가
-- 그 진행 상태를 담는다. 생성은 Next.js after()로 응답과 분리해서 돌리므로
-- 클라이언트가 탭을 닫아도 서버 쪽 생성은 계속되고, 클라이언트는 폴링으로
-- 진행 상황을 받아본다.

CREATE TABLE IF NOT EXISTS blueprint_reports (
  saju_profile_id  UUID PRIMARY KEY REFERENCES saju_profiles(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'generating', -- generating | done | failed
  content          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 누적되는 BlueprintReport 조각(완성 시 전체)
  parts_done       TEXT[] NOT NULL DEFAULT '{}',        -- ['chart','narrative','overview','axis_wealth',...]
  parts_failed     TEXT[] NOT NULL DEFAULT '{}',        -- 실패해서 재시도 대상인 파트
  error_message    TEXT,
  regenerate_count INT NOT NULL DEFAULT 0,              -- 완성본을 다시 생성한 횟수(건당 1회 제한)
  total_chars      INT,              -- 실측 글자수(스펙 9,000자 기준 모니터링용, 완성 시에만 채움)
  grade_a_ratio    NUMERIC(4,3),     -- 근거강도 A 비율(스펙 40% 이하 기준 모니터링용, 완성 시에만 채움)
  expires_at       TIMESTAMPTZ,      -- 010_report_expiry.sql과 동일한 1년 정책(완성 시에만 채움)
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blueprint_reports_user ON blueprint_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_reports_expires ON blueprint_reports(expires_at) WHERE expires_at IS NOT NULL;

GRANT ALL ON blueprint_reports TO service_role;
ALTER TABLE blueprint_reports ENABLE ROW LEVEL SECURITY;
