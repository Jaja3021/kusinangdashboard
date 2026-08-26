-- herbies-dashboard — Admin Expenses v2: track who logged each entry.
-- Run AFTER supabase/admin_expenses.sql has already been applied once.
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

alter table public.admin_expenses add column if not exists logged_by text not null default '';
