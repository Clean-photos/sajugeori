-- 006: 단건(1회성) 이용권 구매 기록
-- 살풀이 990원 1회 이용권 등, 구독과 별개의 단건 상품을 추적한다.
-- used_at이 NULL이면 미사용 이용권. 리포트 생성 성공 시점에 소진 처리.

create table if not exists public.one_time_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,          -- 예: 'salpuri_one'
  amount integer not null,           -- 결제 금액(KRW) 스냅샷
  order_id text not null unique,
  payment_key text,
  status text not null default 'paid',  -- paid | canceled
  used_at timestamptz,               -- NULL = 미사용
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_user_product
  on public.one_time_purchases (user_id, product_id, status, used_at);

alter table public.one_time_purchases enable row level security;

-- 서버(서비스 롤)만 접근. 클라이언트 직접 접근 없음.
grant all on table public.one_time_purchases to service_role;
