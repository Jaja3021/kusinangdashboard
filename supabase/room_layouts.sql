-- herbies-dashboard — Room Diagram editor layouts
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.room_layouts (
  id uuid primary key default gen_random_uuid(),
  branch text not null,               -- matches lib/mt/branches.ts ids: cavite | laguna | metro-manila
  hall_slug text not null,            -- e.g. "hall-a"
  hall_name text not null,            -- e.g. "Cavite Hall A"
  capacity integer not null default 300,
  canvas_width integer not null default 820,
  canvas_height integer not null default 560,
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch, hall_slug)
);

drop trigger if exists room_layouts_set_updated_at on public.room_layouts;
create trigger room_layouts_set_updated_at
  before update on public.room_layouts
  for each row
  execute function public.set_updated_at();

alter table public.room_layouts enable row level security;

-- Only dashboard admins ever reach this page (see middleware.ts), and only
-- admins should read or edit floor plans — same shape as
-- dashboard_profiles.sql's "Admin manage profiles" policy.
drop policy if exists "Admin manage room layouts" on public.room_layouts;
create policy "Admin manage room layouts"
  on public.room_layouts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed two halls per branch. Re-running is safe — existing rows are left
-- untouched (their saved elements/canvas size are never overwritten here).
insert into public.room_layouts (branch, hall_slug, hall_name, capacity, canvas_width, canvas_height)
values
  ('cavite', 'hall-a', 'Cavite Hall A', 300, 820, 560),
  ('cavite', 'hall-b', 'Cavite Hall B', 200, 720, 520),
  ('laguna', 'hall-a', 'Laguna Hall A', 300, 820, 560),
  ('laguna', 'hall-b', 'Laguna Hall B', 200, 720, 520),
  ('metro-manila', 'hall-a', 'Metro Manila Hall A', 300, 820, 560),
  ('metro-manila', 'hall-b', 'Metro Manila Hall B', 200, 720, 520)
on conflict (branch, hall_slug) do nothing;
