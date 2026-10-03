-- 011: 프리미엄 궁합 — "등록된 내 사주"가 아닌 임의의 두 사람 궁합 지원
--
-- 지금까지 premium_compatibility_reports는 항상 saju_profile_id(로그인 사용자의
-- 등록된 본인 사주)를 "A"로 고정하고 상대방(partner_*)만 입력받았다. 친구 커플이나
-- 부모님처럼 나와 무관한 두 사람의 궁합을 보고 싶다는 요청으로, "A" 쪽도 직접
-- 입력할 수 있게 연다. saju_profile_id는 결제/이용권 확인용으로 계속 남기되(구독자
-- 판별은 여전히 로그인 사용자 기준), 실제 캐시 매칭은 A/상대 두 사람의 생년월일·
-- 성별 조합 전체로 한다 — 같은 로그인 사용자가 여러 "임의의 두 사람" 조합을 조회할
-- 수 있으므로 saju_profile_id만으로는 키가 부족하다.
--
-- person_a_birth/gender를 NOT NULL로 강제하기 위해, 기존 행은 saju_profiles에서
-- 본인 생년월일·성별을 그대로 백필한다(기존 행은 전부 "등록된 내 사주" 기준으로
-- 생성됐으므로 이 백필이 실제 값과 정확히 일치한다).

ALTER TABLE premium_compatibility_reports
  ADD COLUMN IF NOT EXISTS person_a_birth  TEXT,
  ADD COLUMN IF NOT EXISTS person_a_gender TEXT;

UPDATE premium_compatibility_reports r
SET person_a_birth = p.birth_date::TEXT,
    person_a_gender = p.gender
FROM saju_profiles p
WHERE r.saju_profile_id = p.id
  AND r.person_a_birth IS NULL;

-- 백필 후에도 saju_profile_id가 끊어져(예: 프로필 삭제) 못 채운 행이 있을 수
-- 있다 — 그런 행은 더 이상 신뢰 가능한 조합이 아니므로 지운다(캐시일 뿐, 원본
-- 리포트가 아니라 안전하게 지울 수 있다).
DELETE FROM premium_compatibility_reports WHERE person_a_birth IS NULL;

ALTER TABLE premium_compatibility_reports
  ALTER COLUMN person_a_birth  SET NOT NULL,
  ALTER COLUMN person_a_gender SET NOT NULL;

-- 기존 UNIQUE(saju_profile_id, partner_birth, partner_gender, context) 제약의
-- 실제 이름은 Postgres가 자동 생성해 정확한 문자열을 예측하기 어렵다 —
-- pg_constraint에서 이 4개 컬럼 조합의 UNIQUE 제약을 찾아 이름 그대로 지운다.
DO $$
DECLARE old_key TEXT;
BEGIN
  SELECT c.conname INTO old_key
  FROM pg_constraint c
  WHERE c.conrelid = 'premium_compatibility_reports'::regclass
    AND c.contype = 'u'
    AND (
      SELECT array_agg(a.attname::TEXT ORDER BY a.attname)
      FROM unnest(c.conkey) AS k(attnum)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    ) = ARRAY['context', 'partner_birth', 'partner_gender', 'saju_profile_id']
  LIMIT 1;

  IF old_key IS NOT NULL THEN
    EXECUTE format('ALTER TABLE premium_compatibility_reports DROP CONSTRAINT %I', old_key);
  END IF;
END $$;

ALTER TABLE premium_compatibility_reports
  ADD CONSTRAINT premium_compatibility_reports_full_key
  UNIQUE (saju_profile_id, person_a_birth, person_a_gender, partner_birth, partner_gender, context);
