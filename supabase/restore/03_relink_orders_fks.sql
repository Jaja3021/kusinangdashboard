-- =====================================================================
-- 02 — Re-link this dashboard's tables to the restored public.orders
-- =====================================================================
-- Run LAST, after 01_quarantine_americanafeast.sql and after re-running
-- the schema files listed in supabase/restore/README.md.
--
-- change_requests.order_id, kitchen_stages.order_id and
-- inventory_reservations.order_id all declared their FK inline in
-- `create table if not exists` (supabase/change_requests.sql:68,
-- kitchen_stages.sql:15, inventory_reservations.sql:40). The tables
-- survived the Americana Feast seed but their FKs did not — the
-- `drop table orders cascade` took them — and re-running those files
-- cannot restore them, because the tables already exist so the CREATE is
-- skipped. This file adds them back explicitly. Safe to re-run.

-- All three tables were empty when this was written (the CASCADE deleted
-- their rows along with the orders). If any orphans have appeared since,
-- this raises rather than silently discarding them.
do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['change_requests', 'kitchen_stages', 'inventory_reservations']
  loop
    execute format(
      'select count(*) from public.%I c where c.order_id is not null
         and not exists (select 1 from public.orders o where o.id = c.order_id)', t)
      into n;
    if n > 0 then
      raise exception
        '%: % row(s) reference an order that no longer exists. Inspect them, then delete them before re-running this file.', t, n;
    end if;
  end loop;
end $$;

alter table public.change_requests
  drop constraint if exists change_requests_order_id_fkey;
alter table public.change_requests
  add constraint change_requests_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete cascade;

alter table public.kitchen_stages
  drop constraint if exists kitchen_stages_order_id_fkey;
alter table public.kitchen_stages
  add constraint kitchen_stages_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete cascade;

alter table public.inventory_reservations
  drop constraint if exists inventory_reservations_order_id_fkey;
alter table public.inventory_reservations
  add constraint inventory_reservations_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete cascade;

-- Verify: all three must report one FK to public.orders.
select
  c.conrelid::regclass::text as child_table,
  c.conname                  as constraint_name,
  c.confrelid::regclass::text as parent_table
from pg_constraint c
where c.contype = 'f'
  and c.confrelid = 'public.orders'::regclass
order by 1;
