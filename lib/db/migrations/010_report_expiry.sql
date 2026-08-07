-- 010: 리포트 캐시 열람기간 1년 (additive-only, 기존 컬럼 무변경)
--
-- 캐시 테이블 6종 전부에 expires_at을 nullable로 추가한다. nullable인 이유는
-- 두 가지다. (1) 이 마이그레이션 이전에 이미 생성된 리포트는 UPDATE하지
-- 않고 NULL로 남긴다 — 지금 결제한 적 없는 사용자의 기존 콘텐츠를 이 배포
-- 순간 소급 만료시키지 않기 위해서다(신규 생성분부터 1년 정책 적용).
-- (2) 애플리케이션 코드가 expires_at을 설정·검사하는 로직을 롤백해도
-- 컬럼 자체는 아무 제약이 없어 그대로 무기한 캐시로 동작한다.
--
-- 실제 삭제는 이 컬럼만으로 일어나지 않는다 — 조회 시에는 만료된 행을
-- 걸러 보여주지 않을 뿐이고(즉시 반영, 별도 배치 불필요), 실제 행 삭제는
-- 매일 1회 도는 배치(app/api/cron/purge-expired-reports)가 담당한다.
-- 매 조회마다 만료 여부를 검사해 그 자리에서 지우는 방식 대신 배치를 택한
-- 이유는 아래 참고.

ALTER TABLE IF EXISTS premium_reports              ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS premium_yearly_reports        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS premium_salpuri_reports       ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS premium_pet_reports           ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS premium_compatibility_reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS premium_taekil_reports        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 배치가 "expires_at <= now()"로 스캔할 때 풀스캔이 되지 않도록 인덱스.
-- NULL(무기한) 행은 배치 대상이 아니므로 partial index로 크기를 줄인다.
CREATE INDEX IF NOT EXISTS idx_premium_reports_expires              ON premium_reports(expires_at)              WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_yearly_reports_expires       ON premium_yearly_reports(expires_at)        WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_salpuri_reports_expires      ON premium_salpuri_reports(expires_at)       WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_pet_reports_expires          ON premium_pet_reports(expires_at)           WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_compatibility_reports_expires ON premium_compatibility_reports(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_taekil_reports_expires       ON premium_taekil_reports(expires_at)        WHERE expires_at IS NOT NULL;

-- 참고 — 조회 시 검사(read-time check) vs 배치 삭제, 부하 비교:
-- 조회 시 검사만으로는 "완전 삭제"를 보장할 수 없다. 그 리포트를 다시 열어보지
-- 않는 사용자의 행은 영원히 DB에 남기 때문이다(단지 안 보여줄 뿐). 개인정보
-- 보관기간 규정을 지키려면 실제 DELETE가 필요하고, 그 DELETE를 "조회할 때마다
-- 만료 여부를 검사해서 그 자리에서 지우는" 방식으로 하면 가장 트래픽이 많은
-- 읽기 경로(사용자가 결과를 열 때마다)에 쓰기 부하가 얹힌다. 반면 하루 1회
-- 배치로 모으면 사용자 요청 지연에 영향을 주지 않고, 부하가 낮은 시간대에
-- 한 번의 스캔+삭제로 끝난다. 그래서 "서빙 제외"는 조회 시 필터(즉시 반영,
-- 추가 비용 거의 없음)로, "실제 삭제"는 저빈도 배치로 분리했다.
