-- 023: 요청 횟수 제한(rate limit) 이벤트 로그 (2026-10-04 보안 점검)
-- 용도: 광고 토큰 발급·로그인 실패·가입·비밀번호 재설정·무료 AI 일일 상한.
-- 서비스 키로만 접근한다(RLS 켜고 정책 없음). 앱 코드는 테이블이 아직 없어도
-- fail-open이라 이 마이그레이션 적용 전에도 서비스는 정상 동작한다(제한만 비활성).
create table if not exists public.rate_limit_events (
  id         bigint generated always as identity primary key,
  kind       text not null,
  key        text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_lookup
  on public.rate_limit_events (kind, key, created_at desc);
create index if not exists idx_rate_limit_created
  on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;

-- 비밀번호 해시 형식이 scrypt$N$salt$hash(약 170자)로 바뀌므로 컬럼이 길이 제한 없는 text여야 한다.
-- 이미 text면 아무 일도 일어나지 않는다.
alter table public.users alter column password_hash type text;
