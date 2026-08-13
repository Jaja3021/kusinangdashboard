-- herbies-dashboard — Food Cost & Margin Calculator saved calculations
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.cost_calculations (
  id uuid primary key default gen_random_uuid(),
  branch text not null,               -- cavite | laguna | metro-manila
  name text not null,
  pax_count integer not null default 0,
  selling_price_per_pax numeric not null default 0,
  target_gp_pct numeric not null default 35,
  items jsonb not null default '[]'::jsonb,  -- [{name, qty, unit, costPerUnit}]
  labour_cost numeric not null default 0,
  overhead_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists cost_calculations_set_updated_at on public.cost_calculations;
create trigger cost_calculations_set_updated_at
  before update on public.cost_calculations
  for each row
  execute function public.set_updated_at();

alter table public.cost_calculations enable row level security;

drop policy if exists "Admin manage cost calculations" on public.cost_calculations;
create policy "Admin manage cost calculations"
  on public.cost_calculations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
