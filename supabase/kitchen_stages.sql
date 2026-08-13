-- herbies-dashboard — Kitchen Pipeline stage tracking
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (references
-- public.orders and reuses public.is_admin()). Paste into the Supabase SQL
-- Editor and run once; safe to re-run.
--
-- This is a dashboard-owned side table, not a column added to herbies'
-- shared `orders` — the physical kitchen-prep workflow (has the order been
-- procured, is it on the stove, is it confirmed ready) is a different
-- concern from `orders.status` (the storefront's confirmation/payment
-- lifecycle, already managed on the Orders page) and neither app should
-- have to agree on the other's states. An order with no row here is simply
-- treated as "Upcoming Orders" — see lib/kitchen/data.ts.

create table if not exists public.kitchen_stages (
  order_id uuid primary key references public.orders(id) on delete cascade,
  stage text not null default 'Upcoming Orders'
    check (stage in ('Upcoming Orders', 'White Board', 'Procured', 'Cooking', 'Confirm')),
  updated_at timestamptz not null default now()
);

drop trigger if exists kitchen_stages_set_updated_at on public.kitchen_stages;
create trigger kitchen_stages_set_updated_at
  before update on public.kitchen_stages
  for each row
  execute function public.set_updated_at();

alter table public.kitchen_stages enable row level security;

drop policy if exists "Admin manage kitchen stages" on public.kitchen_stages;
create policy "Admin manage kitchen stages"
  on public.kitchen_stages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
