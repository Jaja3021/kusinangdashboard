-- herbies-dashboard — inventory reservations
-- Run AFTER supabase/inventory.sql and supabase/recipe_yield.sql. Paste into
-- the Supabase SQL Editor and run once; safe to re-run.
--
-- WHAT THIS CLOSES
-- -----------------
-- Every write path in this app (receiveStock, recordMovement, ...) computes
-- its numbers in TypeScript inside a Server Action, then writes them with a
-- plain authenticated Supabase call — same trust boundary as this feature,
-- since RLS + is_admin() is the real authorization boundary everywhere here,
-- not any client/server split. That stays true for dish->recipe->ingredient
-- resolution (lib/requirements/calc.ts): it's still TypeScript, it still
-- only runs in a Server Action.
--
-- What's NOT safe to leave in TypeScript is the *ledger mutation*: two admins
-- clicking "Complete" on two different orders that both consume the same
-- ingredient, at the same moment, from two different server invocations,
-- with no shared lock between them — read current qty, subtract, write back,
-- classic lost-update race. That's the actual concurrency risk the brief's
-- "Prevent... race conditions when multiple orders are confirmed" is about,
-- and it's what these three functions close: every one of them locks the
-- ingredient_stock row (`for update`) before touching it, so two concurrent
-- calls serialize instead of racing.
--
-- WHY A SEPARATE RESERVATIONS TABLE INSTEAD OF JUST STOCK_MOVEMENTS
-- -------------------------------------------------------------------
-- A reservation is provisional and reversible (an order can un-confirm, its
-- PAX can change, its menu can change) — stock_movements is the immutable
-- audit trail (like activity_log, no update/delete policy) and shouldn't
-- carry rows that get silently rewritten every time an order's requirement
-- is recalculated. So: `inventory_reservations` holds the CURRENT reserved
-- amount per (order, ingredient, branch), freely replaced as the order
-- changes, right up until the order completes — at which point
-- consume_order_reservations() turns it into one real, permanent
-- stock_movements 'Usage' row and the reservation row is deleted, never
-- rewritten again.

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  branch text not null,
  qty numeric not null check (qty >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, ingredient_id, branch)
);

create index if not exists inventory_reservations_ingredient_branch_idx
  on public.inventory_reservations (ingredient_id, branch);
create index if not exists inventory_reservations_order_idx
  on public.inventory_reservations (order_id);

drop trigger if exists inventory_reservations_set_updated_at on public.inventory_reservations;
create trigger inventory_reservations_set_updated_at
  before update on public.inventory_reservations
  for each row
  execute function public.set_updated_at();

alter table public.inventory_reservations enable row level security;

-- Admins can read the ledger directly (e.g. for the ingredient detail
-- drawer's "why is this reserved" breakdown). All WRITES go through the
-- three functions below, never a direct insert/update/delete — that's what
-- makes the row-lock guarantee actually hold. There is deliberately no
-- insert/update/delete policy here for authenticated users; the functions
-- are SECURITY DEFINER and bypass RLS on this table by design, the same way
-- next_order_number() and is_admin() itself do.
drop policy if exists "Admin read inventory reservations" on public.inventory_reservations;
create policy "Admin read inventory reservations"
  on public.inventory_reservations
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- set_order_reservations: replaces every reservation row for one order with
-- the given set. Called whenever an order enters a reserving status
-- (Confirmed..Ready for Delivery — see lib/kitchen/types.ts KITCHEN_STAGES,
-- the same set this dashboard already treats as "in progress") and again
-- any time its PAX or dish selection changes while still in that range.
-- p_lines: [{"ingredient_id": "<uuid>", "qty": <numeric>}, ...]
-- ---------------------------------------------------------------------
create or replace function public.set_order_reservations(p_order_id uuid, p_branch text, p_lines jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.inventory_reservations
  where order_id = p_order_id
    and ingredient_id not in (
      select (line->>'ingredient_id')::uuid from jsonb_array_elements(p_lines) as line
    );

  insert into public.inventory_reservations (order_id, ingredient_id, branch, qty)
  select p_order_id, (line->>'ingredient_id')::uuid, p_branch, (line->>'qty')::numeric
  from jsonb_array_elements(p_lines) as line
  on conflict (order_id, ingredient_id, branch)
  do update set qty = excluded.qty, updated_at = now();
end;
$$;

revoke all on function public.set_order_reservations(uuid, text, jsonb) from public;
grant execute on function public.set_order_reservations(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- release_order_reservations: drops every reservation row for one order,
-- with no stock movement — nothing was ever physically deducted. Called
-- when an order is cancelled or drops back out of the reserving range
-- (e.g. un-confirmed back to Pending Confirmation).
-- ---------------------------------------------------------------------
create or replace function public.release_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.inventory_reservations where order_id = p_order_id;
end;
$$;

revoke all on function public.release_order_reservations(uuid) from public;
grant execute on function public.release_order_reservations(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- consume_order_reservations: the order is Completed. Every reservation
-- becomes a real, permanent deduction — one stock_movements 'Usage' row per
-- ingredient, ingredient_stock decremented under a row lock, then the
-- reservation row is removed (its qty now lives in stock_movements
-- instead). Deducts at most the physical stock on hand (never drives a
-- branch negative, per the brief's "prevent negative inventory" — a
-- discrepancy from unlogged shrinkage elsewhere is a real operational
-- problem, but silently going negative here would corrupt every other
-- report reading ingredient_stock, which is worse).
-- ---------------------------------------------------------------------
create or replace function public.consume_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_number text;
  v_res record;
  v_current numeric;
  v_deduct numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select order_number into v_order_number from public.orders where id = p_order_id;

  for v_res in
    select ingredient_id, branch, qty from public.inventory_reservations where order_id = p_order_id
  loop
    select quantity into v_current
    from public.ingredient_stock
    where ingredient_id = v_res.ingredient_id and branch = v_res.branch
    for update;

    v_current := coalesce(v_current, 0);
    v_deduct := least(v_res.qty, v_current);

    if v_deduct > 0 then
      update public.ingredient_stock
      set quantity = v_current - v_deduct
      where ingredient_id = v_res.ingredient_id and branch = v_res.branch;

      insert into public.stock_movements (ingredient_id, branch, type, qty, unit_cost, reference)
      values (v_res.ingredient_id, v_res.branch, 'Usage', -v_deduct, null, coalesce('Order ' || v_order_number, 'Order ' || p_order_id::text));
    end if;
  end loop;

  delete from public.inventory_reservations where order_id = p_order_id;
end;
$$;

revoke all on function public.consume_order_reservations(uuid) from public;
grant execute on function public.consume_order_reservations(uuid) to authenticated;
