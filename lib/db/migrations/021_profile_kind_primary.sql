-- 021: saju_profiles에 kind(사람/펫)·is_primary(본인 식별 고정 플래그)·species 추가
--
-- [다중 사주 — 우선순위 확정, 2026-09-30/10-01] 7개 범위 중 1)~4)·6)·7).
-- additive-only, 기존 컬럼·row 무변경.
--
-- 배경: 지금까지 "본인"을 가리키는 모든 코드가
--   .eq("label","본인").order("created_at", desc).limit(1)
-- 로 "가장 최근 등록한 row"를 암묵적으로 썼다. 그래서 가족·반려동물 사주를
-- 추가로 등록하면(새 row INSERT일 뿐 기존 row는 안 지워짐에도) "본인" 식별이
-- 그 새 row로 말없이 옮겨가, 기존 리포트의 엔타이틀먼트 앵커가 흔들렸다.
-- is_primary를 명시적 플래그로 둬서 "본인이 누구인가"를 "가장 최근"이
-- 아니라 "내가 명시적으로 지정한 1건"으로 고정한다.
--
-- kind·species는 반려동물을 같은 테이블에서 사람과 함께 관리하기 위한 구분자다
-- (펫은 지금까지 saju_profiles에 전혀 저장되지 않고 리포트 row에만 inline으로
-- 있었다 — "3마리 중 1마리만 연결" 버그의 근본 원인).

ALTER TABLE IF EXISTS saju_profiles
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'pet')),
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS species TEXT;

-- 백필: 유저별로 label='본인'인 행 중 "가장 최근 등록한" 1건을 is_primary=true로.
-- 반드시 기존 코드와 같은 정렬(created_at DESC)이어야 한다 — 지금까지
-- .eq("label","본인").order("created_at",desc).limit(1)로 "최근 1건"을
-- 본인으로 써 왔으므로, 이 전환 시점에 is_primary가 그 최근 row와 다른
-- row에 찍히면 배포 즉시 모든 유저의 "본인"이 엉뚱한 과거 row로 바뀐다.
WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM saju_profiles
  WHERE label = '본인'
)
UPDATE saju_profiles sp
SET is_primary = true
FROM ranked
WHERE sp.id = ranked.id AND ranked.rn = 1;

-- 유저당 kind='person'인 본인(is_primary=true)은 최대 1건만 — 부분 유니크 인덱스로 강제.
-- (펫은 여러 마리가 당연하므로 kind 조건을 둔다. person 중에서도 본인이 아닌
-- 가족 row는 is_primary=false로 여러 건 존재할 수 있다 — 막지 않는다.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saju_profiles_one_primary_person
  ON saju_profiles (user_id)
  WHERE kind = 'person' AND is_primary = true;
