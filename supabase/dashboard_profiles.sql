-- herbies-dashboard — dashboard user profiles
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

-- Display/role metadata for a dashboard account. auth.users only has email
-- + password; this carries the name/role/branch/status the User Access page
-- needs. public.admins (defined in herbies' orders.sql) is the table that
-- actually gates orders/packages RLS — every row here should have a
-- matching admins row, inserted alongside it by the create-user route.

create table if not exists public.dashboard_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null
    check (role in ('Owner', 'Branch Manager', 'Event Coordinator', 'Finance Officer', 'Staff')),
  branch text not null,
  status text not null default 'Active'
    check (status in ('Active', 'Invited', 'Suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists dashboard_profiles_set_updated_at on public.dashboard_profiles;
create trigger dashboard_profiles_set_updated_at
  before update on public.dashboard_profiles
  for each row
  execute function public.set_updated_at();

alter table public.dashboard_profiles enable row level security;

-- A signed-in dashboard user can read their own profile (used by
-- getCurrentUser() to resolve name/role/branch/status after login).
drop policy if exists "Read own profile" on public.dashboard_profiles;
create policy "Read own profile"
  on public.dashboard_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admins can read and manage every profile (User Access page).
drop policy if exists "Admin manage profiles" on public.dashboard_profiles;
create policy "Admin manage profiles"
  on public.dashboard_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
