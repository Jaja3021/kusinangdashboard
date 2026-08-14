-- herbies-dashboard — dates the kitchen is not accepting bookings.
-- Run AFTER herbies' supabase/orders.sql (reuses public.is_admin()). Paste
-- into the Supabase SQL Editor and run once; safe to re-run.
--
-- Read by anon too (not just authenticated admins): the intent is that
-- herbies' own /order/confirm date picker can eventually grey these out for
-- customers directly. Nothing in herbies reads this table yet — that's a
-- follow-up in that repo — but the policy is written now so the table
-- doesn't need touching again when it does.

create table if not exists public.blocked_dates (
  date       date primary key,
  reason     text not null,
  branch     text,                              -- null = every branch
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.blocked_dates enable row level security;

drop policy if exists "Admin manage blocked dates" on public.blocked_dates;
create policy "Admin manage blocked dates"
  on public.blocked_dates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public read blocked dates" on public.blocked_dates;
create policy "Public read blocked dates"
  on public.blocked_dates
  for select
  to anon, authenticated
  using (true);
