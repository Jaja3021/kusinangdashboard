-- herbies-dashboard — Admin Expenses (operational overhead tracking)
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- public.set_updated_at() and public.is_admin()). Paste into the Supabase
-- SQL Editor and run once; safe to re-run.
--
-- Operational expenses only (rent, utilities, supplies, repairs, etc.) —
-- salary, commissions, bonuses, and owner distributions are deliberately
-- never entered here; that's enforced by the dashboard UI, not this schema.

create table if not exists public.admin_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  branch text not null default '',     -- '' = not yet assigned (counts toward "Missing Branch/Category")
  category text not null default '',   -- '' = not yet assigned
  vendor text not null default '',
  amount numeric not null default 0,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Paid')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_expenses_date_idx on public.admin_expenses (expense_date desc);

drop trigger if exists admin_expenses_set_updated_at on public.admin_expenses;
create trigger admin_expenses_set_updated_at
  before update on public.admin_expenses
  for each row
  execute function public.set_updated_at();

alter table public.admin_expenses enable row level security;

drop policy if exists "Admin manage admin expenses" on public.admin_expenses;
create policy "Admin manage admin expenses"
  on public.admin_expenses
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
