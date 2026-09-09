-- 020: 궁합 상대방 태어난 시각 (additive-only, 기존 컬럼 무변경)
--
-- QA(2026-09-08, CoS+CEO 실물 확인 §7-1): 상대방 입력란에 태어난 시각이
-- 아예 없어 모든 상대가 시주 제외로 판정됐다. 오행 리포트 등 다른 상품에는
-- "시간 미상" 안내 사양이 있는데 궁합에만 없었다.
--
-- NOT NULL DEFAULT ''로 둔다 — TEXT UNIQUE 제약에 NULL을 쓰면 Postgres가
-- NULL끼리도 서로 다른 값으로 취급해 캐시 키가 흔들린다(016/018과 동일 규칙).
-- ''는 "시각 모름"을 뜻한다. 기존 행(이 컬럼 도입 전 생성분)은 전부 ''로
-- 채워지므로, 조회 시 그 행들은 "시각 모름"으로 안전하게 해석된다.

ALTER TABLE IF EXISTS premium_compatibility_reports
  ADD COLUMN IF NOT EXISTS partner_birth_time TEXT NOT NULL DEFAULT '';
