-- herbies-dashboard — Branch registry (was a hardcoded TS constant; now a
-- real, admin-editable table so "Add Branch" in User Access can persist).
-- Run AFTER herbies' supabase/schema.sql (reuses public.is_admin()).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.branches (
  id text primary key,
  name text not null unique,
  -- One of the 7 presets offered in the Add Branch picker, plus 'red' kept
  -- only for Cavite's existing legacy color (not offered as a new choice).
  color text not null
    check (color in ('red', 'orange', 'blue', 'purple', 'green', 'pink', 'teal', 'indigo')),
  created_at timestamptz not null default now()
);

alter table public.branches enable row level security;

-- Every signed-in dashboard account needs to read the branch list (topbar
-- selector, forms, badges) — there's nothing sensitive in it.
drop policy if exists "Read branches" on public.branches;
create policy "Read branches"
  on public.branches
  for select
  to authenticated
  using (true);

drop policy if exists "Admin manage branches" on public.branches;
create policy "Admin manage branches"
  on public.branches
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the 3 branches the app already ran with as a hardcoded constant —
-- same ids, since real orders/bookings already reference them.
insert into public.branches (id, name, color) values
  ('cavite', 'Cavite', 'red'),
  ('laguna', 'Laguna', 'orange'),
  ('metro-manila', 'Metro Manila', 'green')
on conflict (id) do nothing;
