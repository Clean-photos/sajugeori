-- 024: 회원 탈퇴 시 결제 기록 보존 (2026-10-04 점검)
-- 처리방침은 "결제 기록 5년 보관(전자상거래법)"이라고 안내하는데, 실제 DB는 세 결제 테이블이
-- public.users를 ON DELETE CASCADE로 참조해 탈퇴하면 결제 기록이 함께 지워졌다.
-- user_id만 비우고(ON DELETE SET NULL) 주문번호·금액·결제키·일시 등은 남긴다.
-- 쿠폰 사용 기록(coupon_redemptions)·리포트 등 개인 데이터는 그대로 cascade로 지운다.
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['payment_orders', 'one_time_purchases', 'subscriptions'] loop
    for c in
      select conname from pg_constraint
      where conrelid = ('public.' || t)::regclass and contype = 'f' and confrelid = 'public.users'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', t, c);
    end loop;
    execute format('alter table public.%I alter column user_id drop not null', t);
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references public.users(id) on delete set null',
      t, t || '_user_id_fkey'
    );
  end loop;
end $$;
