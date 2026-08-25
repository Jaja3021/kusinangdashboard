-- herbies-dashboard — Catering Calendar daily capacity
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.
--
-- The ONLY new table the Catering Calendar needs. Everything else it shows
-- already exists:
--   * events/bookings  -> public.orders (an order IS the booking)
--   * CLOSED dates     -> public.blocked_dates (supabase/blocked_dates.sql),
--                         which the CUSTOMER menu builder already reads via
--                         its EventDatePicker — so admin-side "mark closed"
--                         and customer-side "this date is unavailable" stay
--                         one source of truth, with nothing to sync.
--
-- Per-branch rather than one global row: the topbar branch selector already
-- scopes every other page in this dashboard (lib/mt/branches.ts), and the
-- three kitchens genuinely have different ceilings. An "All Branches" view
-- sums these rows.

create table if not exists public.calendar_capacity (
  branch text primary key,             -- cavite | laguna | metro-manila
  max_events_per_day integer not null default 3,
  max_pax_per_day integer not null default 400,
  updated_at timestamptz not null default now()
);

drop trigger if exists calendar_capacity_set_updated_at on public.calendar_capacity;
create trigger calendar_capacity_set_updated_at
  before update on public.calendar_capacity
  for each row
  execute function public.set_updated_at();

alter table public.calendar_capacity enable row level security;

-- Read + write is admin-only, same shape as breakeven_settings.sql. Which
-- admins may actually EDIT capacity is narrowed further in the app layer to
-- the "manage:capacity" capability (lib/auth/permissions.ts — Owner only),
-- since dashboard_profiles.role isn't visible to RLS here.
drop policy if exists "Admin manage calendar capacity" on public.calendar_capacity;
create policy "Admin manage calendar capacity"
  on public.calendar_capacity
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed all three branches with the same starting ceiling; each branch's
-- numbers are independent from here on and edited from Calendar Settings.
-- Re-running never overwrites a ceiling an admin has already tuned.
insert into public.calendar_capacity (branch, max_events_per_day, max_pax_per_day)
values
  ('cavite', 3, 400),
  ('laguna', 3, 300),
  ('metro-manila', 3, 350)
on conflict (branch) do nothing;
