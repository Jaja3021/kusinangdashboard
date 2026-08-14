-- herbies-dashboard — per-package "dish slots".
-- Run AFTER herbies' supabase/schema.sql and supabase/menu_orders_v2.sql
-- (reuses public.packages, already has an `active` column by then). Paste
-- into the Supabase SQL Editor and run once; safe to re-run.
--
-- A dish slot is one line of a combo: category + which dish fills it, what
-- tray size/quantity, and whether the customer is allowed to swap it for a
-- different dish in that category at checkout. Stored as JSONB on the
-- package row itself (same treatment as pax_tiers/tray_catalog already get
-- in menu_orders_v2.sql's sibling files) rather than a child table, since
-- slots are always read/written as a whole ordered list scoped to one
-- package — never queried across packages.

alter table public.packages
  add column if not exists dish_slots jsonb not null default '[]'::jsonb;

-- Shape (documented here, not enforced — same convention as pax_tiers):
-- [{ id: uuid, category: text, dish: text, traySize: 'Family'|'Feast'|'XXXL',
--    quantity: integer, swappable: boolean }]
