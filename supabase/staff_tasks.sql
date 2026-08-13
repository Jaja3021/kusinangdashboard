-- herbies-dashboard — Staff Tasks kanban board
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  branch text not null,               -- cavite | laguna | metro-manila
  title text not null,
  assignee text not null default '',
  event text not null default '',     -- free-text event/booking reference
  due_date date,
  priority text not null default 'Medium'
    check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'To Do'
    check (status in ('To Do', 'In Progress', 'Waiting', 'Done')),
  position integer not null default 0,  -- order within a status column
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_tasks_status_idx on public.staff_tasks (status, position);

drop trigger if exists staff_tasks_set_updated_at on public.staff_tasks;
create trigger staff_tasks_set_updated_at
  before update on public.staff_tasks
  for each row
  execute function public.set_updated_at();

alter table public.staff_tasks enable row level security;

drop policy if exists "Admin manage staff tasks" on public.staff_tasks;
create policy "Admin manage staff tasks"
  on public.staff_tasks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
