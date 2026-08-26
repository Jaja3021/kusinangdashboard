-- herbies-dashboard — dashboard_profiles v2: new role set, multi-branch
-- access, per-page access, and the close-dates flag.
-- Run AFTER supabase/dashboard_profiles.sql has already been applied once.
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

-- 1. Remap existing roles onto the new 9-role set before the constraint changes.
update public.dashboard_profiles set role = 'Sales Staff' where role = 'Event Coordinator';
update public.dashboard_profiles set role = 'Finance Staff' where role = 'Finance Officer';
update public.dashboard_profiles set role = 'Kitchen Staff' where role = 'Staff';

-- 2. Swap the role check constraint for the new role set.
alter table public.dashboard_profiles drop constraint if exists dashboard_profiles_role_check;
alter table public.dashboard_profiles add constraint dashboard_profiles_role_check
  check (role in (
    'Owner', 'Admin', 'Branch Manager', 'Sales Staff', 'Kitchen Staff',
    'Operations Staff', 'Finance Staff', 'Tech Team', 'Developer'
  ));

-- 3. Multi-branch access: add `branches`, backfill from the old single
-- `branch` column, then drop it.
alter table public.dashboard_profiles add column if not exists branches text[] not null default '{}';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dashboard_profiles' and column_name = 'branch'
  ) then
    update public.dashboard_profiles
      set branches = array[branch]
      where branches = '{}' and branch is not null;
  end if;
end $$;

alter table public.dashboard_profiles drop column if exists branch;

-- 4. Per-page access. Owner/Developer are full-access roles (see
-- lib/auth/current-user.ts's hasFullAccess) and bypass this list entirely,
-- but backfill it anyway so the User Access UI doesn't show them as
-- page-less.
alter table public.dashboard_profiles add column if not exists page_access text[] not null default '{}';
update public.dashboard_profiles
  set page_access = array[
    '/dashboard', '/dashboard/inquiries', '/dashboard/customers', '/dashboard/menu',
    '/dashboard/user-access', '/dashboard/kitchen', '/dashboard/orders',
    '/dashboard/bookings', '/dashboard/staff-tasks', '/dashboard/inventory',
    '/dashboard/costing', '/dashboard/activity-log', '/dashboard/admin-expenses',
    '/dashboard/sales', '/dashboard/payments', '/dashboard/branch-performance',
    '/dashboard/reports', '/dashboard/owner-financials', '/dashboard/cost-calculator',
    '/dashboard/breakeven', '/dashboard/room-diagram'
  ]
  where role in ('Owner', 'Developer');

-- 5. Independent "can close dates" flag (screenshot: "Admin — can close
-- dates"), unrelated to the Role field.
alter table public.dashboard_profiles add column if not exists can_close_dates boolean not null default false;
update public.dashboard_profiles set can_close_dates = true where role in ('Owner', 'Developer');
