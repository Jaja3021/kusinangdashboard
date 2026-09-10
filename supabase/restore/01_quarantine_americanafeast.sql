-- =====================================================================
-- 01 — Quarantine the Americana Feast tables out of `public`
-- =====================================================================
-- On 2026-08-31 15:35:28 UTC a seed script belonging to a DIFFERENT app
-- ("Americana Feast Co.", USD, New York — see public.settings) was run
-- against this Supabase project. It did `drop table public.orders cascade`
-- and recreated `orders`/`payments` with its own restaurant schema, which
-- is why this dashboard now dies with
--   column orders.package_name does not exist
-- and why change_requests / kitchen_stages / inventory_reservations lost
-- their foreign keys to orders (the CASCADE took them) and are empty.
--
-- Americana Feast has its own database. This file does NOT delete its
-- data — it moves those tables into a separate `americanafeast` schema so
-- they stop colliding with Kusinang Pamana and stop being exposed through
-- PostgREST (which only serves `public`). Nothing is dropped; if any of it
-- is ever needed it is still there, one schema over.
--
-- Run this FIRST, in the Supabase SQL Editor. Safe to re-run.

create schema if not exists americanafeast;

-- Child tables move before their parents so nothing is left dangling
-- mid-transaction. FKs between these tables follow the tables and stay
-- intact; RLS policies and indexes move with them too.
do $$
declare
  t text;
  moved int := 0;
begin
  foreach t in array array[
    'order_items',
    'booking_items',
    'reviews',
    'notifications',
    'automation_logs',
    'contact_submissions',
    'gallery',
    'menu_items',
    'categories',
    'catering_packages',
    'inventory',
    'settings',
    'profiles',
    'payments',
    'bookings',
    'orders'
  ]
  loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('alter table public.%I set schema americanafeast', t);
      moved := moved + 1;
      raise notice 'moved public.% -> americanafeast.%', t, t;
    else
      raise notice 'skipped % (not in public)', t;
    end if;
  end loop;
  raise notice 'quarantine complete: % table(s) moved', moved;
end $$;

-- The enum types public.order_status / payment_status / payment_method
-- also came from that seed. They are deliberately LEFT in public: the
-- Kusinang schema stores those columns as text with check constraints, so
-- the types collide with nothing, and moving them would have to be
-- co-ordinated with every moved table that still uses them.

-- Sanity check — public.orders must be gone before step 02 can recreate it.
do $$ begin
  if to_regclass('public.orders') is not null then
    raise exception 'public.orders still exists — quarantine did not complete';
  end if;
end $$;
