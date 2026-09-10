-- =====================================================================
-- 02 — Columns on `orders` that exist in no schema file
-- =====================================================================
-- Run AFTER herbies' orders.sql / payments.sql / rush-fee.sql, BEFORE
-- step 03. Safe to re-run.
--
-- `servers` is read by this dashboard (lib/orders/data.ts's
-- ORDER_WITH_MENU_COLUMNS, exposed as OrderWithMenu.servers) and written by
-- approve_change_request (supabase/change_requests.sql:341, casting
-- `(v_d->>'servers')::integer`) — but it is declared in NO .sql file in
-- either repo. It was added by hand in the Supabase SQL Editor at some
-- point, so it was invisible to a schema-file-driven restore and would
-- otherwise come back missing, breaking getOrderWithMenuById() and every
-- change-request approval.
--
-- Nullable with no default, matching `OrderWithMenu.servers: number | null`
-- and the coalesce() in approve_change_request (absent key = unchanged).

alter table public.orders add column if not exists servers integer;

-- Verify: every column this dashboard selects must be present. Any row
-- returned by this query is a column still missing.
select c.name as missing_column
from unnest(array[
  'id','order_number','status','payment_status','package_name','quantity_label',
  'pax','event_type','event_date','event_time','venue','branch','first_name',
  'last_name','email','phone','total','created_at','servers','package_slug',
  'menu_id','menu_name','menu_snapshot','cart','packed_meal_cart',
  'selected_dishes','subtotal','delivery_fee','rush_fee','deposit_amount',
  'amount_paid','delivery_method','instructions'
]) as c(name)
where not exists (
  select 1 from information_schema.columns ic
  where ic.table_schema = 'public' and ic.table_name = 'orders'
    and ic.column_name = c.name
);
