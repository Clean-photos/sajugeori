-- 022: 상품별 리포트 테이블 7개 → reports 테이블 하나로 통합
--
-- [리포트 7개 테이블 통합, 2026-10-02 CEO 지시: "이용자 없을 때 지금 해결"]
--
-- 대상 7개: premium_reports(saju_one) · premium_salpuri_reports(salpuri_one) ·
-- premium_taekil_reports(taekil_one) · premium_yearly_reports(yearly_one) ·
-- premium_wuxing_reports(wuxing_one) · premium_compatibility_reports(compatibility_one) ·
-- premium_pet_reports(pet_one).
--
-- 제외: blueprint_reports(운명 설계도)는 포함 안 함 — status/parts_done/attempt_id/
-- pass_id/regenerate_count 같은 재개형 다단계 생성 전용 컬럼이 있어 이 7개와 데이터
-- 모양이 근본적으로 다르다(생성 1회 완결 vs 폴링으로 이어가는 상태 머신). 억지로
-- 합치면 reports 테이블에 7개 상품 중 아무도 안 쓰는 destiny 전용 컬럼만 늘어난다.
-- premium_adhoc_reports(가족·지인 대상 1회성 캐시)도 제외 — 이미 전 상품 공통
-- 구조라 통합의 필요성 자체가 없다.
--
-- 롤백 설계: 이 마이그레이션은 기존 7개 테이블을 전혀 지우지 않는다(DROP 없음).
-- 데이터는 복사(COPY)이지 이동(MOVE)이 아니다 — 코드를 새 테이블을 쓰도록 바꾼 뒤
-- 문제가 생기면, 코드만 이전 커밋으로 되돌리면 기존 7개 테이블이 그대로 살아있어
-- 즉시 복구된다. (현재 결제 고객이 없는 시점이라 전환 중 새로 쓰이는 데이터가
-- 있어도 손실 영향이 사실상 없다.)
--
-- 이 파일은 테이블 생성만 한다. 실제 데이터 백필은 Node 스크립트로 별도 실행한다
-- (7개 테이블의 content 컬럼 타입이 제각각(TEXT vs JSONB)이라 SQL보다 JS에서
-- 변환하는 편이 안전하고 검증하기 쉽다).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  -- §(2026-10-02 실물 확인): 다른 전용 테이블(예: auth.users)이 아니라 이 앱의
  -- NextAuth 커스텀 테이블인 public.users를 참조해야 한다 — saju_profiles·
  -- premium_reports 등 기존 테이블 전부 이 컨벤션이고, auth.users로 처음
  -- 만들었다가 FK 위반으로 백필이 전부 실패해 바로 잡았다.
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null,  -- 'saju_one' | 'salpuri_one' | 'taekil_one' | 'yearly_one' | 'wuxing_one' | 'compatibility_one' | 'pet_one'
  profile_id uuid not null references public.saju_profiles(id) on delete cascade,
  -- 같은 (profile_id, product_id) 안에서 서로 다른 리포트를 구분하는 키.
  -- yearly: 연도. taekil: 목적|시작일|종료일. compatibility: 상대생년월일|상대시각|상대성별|관계유형.
  -- pet: 종|이름|연|월|일. 나머지(saju/salpuri/wuxing)는 profile_id 하나에 리포트 1건뿐이라 ''.
  variant text not null default '',
  content jsonb not null,   -- 상품이 클라이언트에 "report"로 돌려주는 본문 그대로(문자열 or 객체)
  extra jsonb not null default '{}'::jsonb,  -- 원래 테이블에 있던 부가 컬럼(점수·날짜범위·펫 정보 등) 보존용. 앱 코드는 기본적으로 안 읽음 — 감사·디버깅·향후 확장 대비.
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (profile_id, product_id, variant)
);

create index if not exists idx_reports_user_product on public.reports(user_id, product_id);
create index if not exists idx_reports_expires on public.reports(expires_at) where expires_at is not null;

alter table public.reports enable row level security;
grant all on table public.reports to service_role;
