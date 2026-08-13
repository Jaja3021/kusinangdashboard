-- herbies-dashboard — Break-even Dashboard settings
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.breakeven_settings (
  branch text primary key,  -- cavite | laguna | metro-manila
  rent numeric not null default 0,
  utilities numeric not null default 0,
  staff_salaries numeric not null default 0,
  insurance numeric not null default 0,
  marketing numeric not null default 0,
  other_fixed numeric not null default 0,
  variable_cost_per_event numeric not null default 0,
  avg_pax_per_event numeric not null default 0,
  selling_price_per_pax numeric not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists breakeven_settings_set_updated_at on public.breakeven_settings;
create trigger breakeven_settings_set_updated_at
  before update on public.breakeven_settings
  for each row
  execute function public.set_updated_at();

alter table public.breakeven_settings enable row level security;

drop policy if exists "Admin manage breakeven settings" on public.breakeven_settings;
create policy "Admin manage breakeven settings"
  on public.breakeven_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed all three branches with the same starting model; each branch's
-- numbers are independent from here on and edited via the dashboard.
insert into public.breakeven_settings
  (branch, rent, utilities, staff_salaries, insurance, marketing, other_fixed, variable_cost_per_event, avg_pax_per_event, selling_price_per_pax)
values
  ('cavite', 80000, 28000, 250000, 11000, 16000, 12000, 11000, 115, 850),
  ('laguna', 80000, 28000, 250000, 11000, 16000, 12000, 11000, 115, 850),
  ('metro-manila', 80000, 28000, 250000, 11000, 16000, 12000, 11000, 115, 850)
on conflict (branch) do nothing;
