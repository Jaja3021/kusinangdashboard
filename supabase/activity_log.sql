-- herbies-dashboard — Activity Log (audit trail for Inventory & Costing writes)
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- public.is_admin()). Paste into the Supabase SQL Editor and run once;
-- safe to re-run.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  module text not null,          -- "Inventory" | "Costing" | "Staff Tasks"
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  entity text not null,          -- "Ingredient" | "Recipe" | "BOM Item" | "Stock Receipt" | ...
  name text not null default '',
  details text not null default '',
  user_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

-- Entries are an immutable trail: admins can read and insert, but never
-- update or delete a row (no update/delete policy is defined at all).
drop policy if exists "Admin read activity log" on public.activity_log;
create policy "Admin read activity log"
  on public.activity_log
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin write activity log" on public.activity_log;
create policy "Admin write activity log"
  on public.activity_log
  for insert
  to authenticated
  with check (public.is_admin());
