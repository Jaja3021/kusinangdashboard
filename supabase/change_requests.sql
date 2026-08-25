-- herbies-dashboard — Change Request Approval System
-- Run AFTER herbies' supabase/orders.sql and supabase/payments.sql, and
-- AFTER herbies-dashboard's supabase/inventory_reservations.sql (reuses
-- public.set_updated_at() and public.is_admin() from the former, and follows
-- the read-only-RLS-plus-SECURITY-DEFINER-functions shape of the latter).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.
--
-- WHAT THIS IS
-- ------------
-- The Meal Builder (herbies' storefront, same Supabase project) lets a
-- customer ask to change a booking they already placed — more pax, a
-- different dish, more servers, a new total. It files a REQUEST into
-- public.change_requests. This dashboard is where an admin reviews it
-- against real operational data and approves or rejects it. Only an
-- approval mutates public.orders — the Meal Builder must never write to
-- orders directly for an existing booking, exactly the way it already never
-- writes orders.amount_paid/payment_status directly (payments.sql §2/§5).
--
-- MEAL BUILDER INSERT CONTRACT
-- -----------------------------
-- insert into public.change_requests
--   (order_id, client_id, original_data, requested_data,
--    original_total, requested_total, client_notes, requested_by, requested_by_name)
-- values (...);
--
-- original_data / requested_data are jsonb objects. Keys are snake_case and
-- match orders columns exactly — the approval function below is a straight
-- key-to-column map with no translation layer. Whitelist (all optional):
--   pax, servers, package_slug, package_name, menu_id, menu_name,
--   quantity_label, cart, packed_meal_cart, selected_dishes, menu_snapshot,
--   subtotal, delivery_fee, rush_fee
--
-- Rules the Meal Builder must follow:
--   - original_data MUST be a faithful snapshot of the order's columns AT
--     SUBMIT TIME, for every key present in requested_data. The dashboard
--     diffs the two and warns when original_data disagrees with the live
--     order (someone else changed it in between).
--   - original_total MUST equal orders.total at submit time.
--   - requested_total is authoritative — this dashboard does not reprice.
--   - Do NOT send event_date/event_time/venue/branch/status/payment columns.
--     A date/venue move is a different workflow (capacity, blocked dates,
--     rush recalculation) and approve_change_request() below silently
--     ignores those keys even if present.
--   - A unique-violation (23505) on change_requests_one_pending_per_order_idx
--     means an open request already exists against this order — cancel it
--     (update status to 'cancelled', which the customer's own RLS policy
--     allows) before submitting a new one.

-- =====================================================================
-- 1. orders.servers — the one new column on the shared orders table
-- =====================================================================
-- Nullable, no default: null = never specified, 0 = explicitly none.
-- Existing rows stay null and the dashboard renders "—".

alter table public.orders add column if not exists servers integer;

do $$ begin
  alter table public.orders add constraint orders_servers_check
    check (servers is null or servers >= 0);
exception when duplicate_object then null; end $$;

-- =====================================================================
-- 2. public.change_requests
-- =====================================================================

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  client_id uuid,                                    -- auth.uid() of the storefront customer; null for guest checkouts

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),

  original_data  jsonb not null default '{}'::jsonb,
  requested_data jsonb not null default '{}'::jsonb,

  original_total  numeric not null default 0,
  requested_total numeric not null default 0,
  -- Generated, not submitted: the difference can never disagree with the
  -- two totals it's derived from.
  price_difference numeric generated always as (requested_total - original_total) stored,

  -- Nullable: the Meal Builder has no recipe/ingredient data, so these will
  -- usually be null in practice. The dashboard's own computed food cost
  -- (lib/change-requests/impact.ts) is preferred; these are a fallback.
  original_cost  numeric,
  requested_cost numeric,

  client_notes text not null default '',
  requested_by uuid,
  requested_by_name text not null default '',
  requested_at timestamptz not null default now(),

  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_name text not null default '',            -- denormalized, same reason activity_log.user_name is
  reviewed_at timestamptz,
  rejection_reason text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists change_requests_order_idx on public.change_requests (order_id);
create index if not exists change_requests_status_requested_at_idx on public.change_requests (status, requested_at desc);
create index if not exists change_requests_client_idx on public.change_requests (client_id);

-- At most one open request per order — closes "customer files three
-- competing requests, admin approves them out of order" at the database.
-- A 23505 on this index is the Meal Builder's signal to cancel-then-retry.
create unique index if not exists change_requests_one_pending_per_order_idx
  on public.change_requests (order_id) where status = 'pending';

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at
  before update on public.change_requests
  for each row
  execute function public.set_updated_at();

do $$ begin
  alter publication supabase_realtime add table public.change_requests;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- 3. RLS
-- =====================================================================
-- is_admin() is the only thing RLS can see (it cannot distinguish Owner
-- from Staff — see lib/auth/permissions.ts on the dashboard side for the
-- role-level check). The customer side keys off orders.email = auth.email(),
-- the same mechanism as herbies' "Customer read own order" policy.

alter table public.change_requests enable row level security;

drop policy if exists "Admin read change requests" on public.change_requests;
create policy "Admin read change requests"
  on public.change_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Customer read own change requests" on public.change_requests;
create policy "Customer read own change requests"
  on public.change_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = change_requests.order_id and o.email = auth.email()
    )
  );

drop policy if exists "Customer insert own change request" on public.change_requests;
create policy "Customer insert own change request"
  on public.change_requests
  for insert
  to authenticated
  with check (
    status = 'pending'
    and reviewed_by is null and reviewed_at is null and rejection_reason = ''
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.email = auth.email()
        and o.status not in ('Completed', 'Cancelled')
    )
  );

drop policy if exists "Customer cancel own pending change request" on public.change_requests;
create policy "Customer cancel own pending change request"
  on public.change_requests
  for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = change_requests.order_id and o.email = auth.email()
    )
  )
  with check (status in ('pending', 'cancelled'));

-- Trap this closes: the UPDATE policy above only constrains the *resulting*
-- status, not which columns move. Without this trigger a customer could
-- rewrite requested_data/requested_total on their own pending row while an
-- admin has the review modal open. Non-admins may do exactly one thing —
-- pending -> cancelled — and touch no other column.
create or replace function public.change_requests_guard_customer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status <> 'cancelled' or old.status <> 'pending' then
    raise exception 'customers may only cancel a pending change request';
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'customers may not modify a change request in place';
  end if;

  return new;
end;
$$;

drop trigger if exists change_requests_guard_customer_update on public.change_requests;
create trigger change_requests_guard_customer_update
  before update on public.change_requests
  for each row
  execute function public.change_requests_guard_customer_update();

-- Deliberately NO admin insert/update/delete policy. Every admin write goes
-- through the SECURITY DEFINER functions below, never a direct mutation —
-- the same reasoning as supabase/inventory_reservations.sql: it's the only
-- way the row locks in approve_change_request() actually hold.

-- =====================================================================
-- 4. Functions
-- =====================================================================

-- ---------------------------------------------------------------------
-- recompute_order_payment_state_for: replicates the CASE in herbies'
-- public.recompute_order_payment_state() (herbies/supabase/payments.sql,
-- section 5) — that one is a trigger function bound to NEW/OLD off the
-- `payments` table, so it cannot be called directly here. Duplication is
-- forced; if that CASE ever changes, this one must change with it.
--
-- Needed because approve_change_request() below can move orders.total,
-- and the payments trigger only re-fires on `payments` row changes, not on
-- `orders.total` changes — so payment_status would otherwise go stale
-- (an order 'Paid' at ₱85,000 would silently stay 'Paid' at ₱93,500).
-- ---------------------------------------------------------------------
create or replace function public.recompute_order_payment_state_for(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_deposit numeric;
  v_verified numeric;
  v_pending integer;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select total, coalesce(deposit_amount, 0) into v_total, v_deposit
  from public.orders where id = p_order_id
  for update;
  if not found then return; end if;

  select coalesce(sum(amount) filter (where status = 'Verified'), 0),
         count(*) filter (where status = 'Submitted')
    into v_verified, v_pending
  from public.payments where order_id = p_order_id;

  v_status := case
    when v_verified >= v_total                      then 'Paid'
    when v_pending > 0                               then 'Awaiting Verification'
    when v_verified >= v_deposit and v_verified > 0  then 'Deposit Paid'
    when v_verified > 0                              then 'Partially Paid'
    else 'Unpaid'
  end;

  update public.orders
  set amount_paid = v_verified, payment_status = v_status
  where id = p_order_id
    and (amount_paid is distinct from v_verified or payment_status is distinct from v_status);
end;
$$;

revoke all on function public.recompute_order_payment_state_for(uuid) from public;
grant execute on function public.recompute_order_payment_state_for(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- approve_change_request: the whole approval is one function, one
-- transaction, atomic. Locks the REQUEST first, then the ORDER — always
-- this order, everywhere in this file, or two concurrent approvals on two
-- different requests for the same order can deadlock.
-- ---------------------------------------------------------------------
create or replace function public.approve_change_request(
  p_id uuid,
  p_reviewer_name text default '',
  p_force boolean default false
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.change_requests;
  v_order public.orders;
  v_d jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_req from public.change_requests where id = p_id for update;
  if not found then
    raise exception 'change request not found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'change request is already %', v_req.status;
  end if;

  select * into v_order from public.orders where id = v_req.order_id for update;
  if not found then
    raise exception 'order not found';
  end if;

  -- Hard blocks — never forceable. A date/venue move is a different
  -- workflow entirely and is out of scope for this function.
  if v_order.status in ('Completed', 'Cancelled') then
    raise exception 'cannot apply a change to a % order', v_order.status;
  end if;

  -- Drift guard — forceable. The dashboard shows the banner; the admin
  -- decides whether to proceed anyway.
  if not p_force and v_order.total is distinct from v_req.original_total then
    raise exception 'stale change request: order total is now %, request was priced against %',
      v_order.total, v_req.original_total;
  end if;

  v_d := v_req.requested_data;

  -- Absent key = unchanged. nullif(..., 'null'::jsonb) matters: without it,
  -- an explicit JSON null in the payload would be treated as "write jsonb
  -- null" by coalesce (jsonb null is not SQL null), silently wiping the
  -- column instead of leaving it alone.
  update public.orders set
    pax              = coalesce((v_d->>'pax')::integer, pax),
    servers          = coalesce((v_d->>'servers')::integer, servers),
    package_slug     = coalesce(v_d->>'package_slug', package_slug),
    package_name     = coalesce(v_d->>'package_name', package_name),
    menu_id          = coalesce(v_d->>'menu_id', menu_id),
    menu_name        = coalesce(v_d->>'menu_name', menu_name),
    quantity_label   = coalesce(v_d->>'quantity_label', quantity_label),
    cart             = coalesce(nullif(v_d->'cart', 'null'::jsonb), cart),
    packed_meal_cart = coalesce(nullif(v_d->'packed_meal_cart', 'null'::jsonb), packed_meal_cart),
    selected_dishes  = coalesce(nullif(v_d->'selected_dishes', 'null'::jsonb), selected_dishes),
    menu_snapshot    = coalesce(nullif(v_d->'menu_snapshot', 'null'::jsonb), menu_snapshot),
    subtotal         = coalesce((v_d->>'subtotal')::numeric, subtotal),
    delivery_fee     = coalesce((v_d->>'delivery_fee')::numeric, delivery_fee),
    rush_fee         = coalesce((v_d->>'rush_fee')::numeric, rush_fee),
    total            = v_req.requested_total,
    updated_at       = now()
  where id = v_req.order_id;

  -- Deliberately NEVER written here: status, event_date, event_time, venue,
  -- branch, first_name/last_name/email/phone, deposit_amount, amount_paid,
  -- payment_status, order_number, order_number. Even if requested_data
  -- carries those keys, this function ignores them.

  update public.change_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewer_name = p_reviewer_name,
      reviewed_at = now()
  where id = p_id
  returning * into v_req;

  -- total just moved; nothing else re-derives payment_status/amount_paid
  -- for an orders-side change (only the payments trigger does, and only on
  -- payments rows).
  perform public.recompute_order_payment_state_for(v_req.order_id);

  return v_req;
end;
$$;

revoke all on function public.approve_change_request(uuid, text, boolean) from public;
grant execute on function public.approve_change_request(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- reject_change_request: never touches orders. Requires a reason.
-- ---------------------------------------------------------------------
create or replace function public.reject_change_request(
  p_id uuid,
  p_reason text,
  p_reviewer_name text default ''
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.change_requests;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a rejection reason is required';
  end if;

  select * into v_req from public.change_requests where id = p_id for update;
  if not found then
    raise exception 'change request not found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'change request is already %', v_req.status;
  end if;

  update public.change_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewer_name = p_reviewer_name,
      reviewed_at = now(),
      rejection_reason = trim(p_reason)
  where id = p_id
  returning * into v_req;

  return v_req;
end;
$$;

revoke all on function public.reject_change_request(uuid, text, text) from public;
grant execute on function public.reject_change_request(uuid, text, text) to authenticated;

-- =====================================================================
-- 5. SEED — do not run in production
-- =====================================================================
-- Uncomment and run in the Supabase SQL Editor to create a pending request
-- against the newest Confirmed order, for testing the dashboard without a
-- live Meal Builder. Bumps pax by 30, servers by 2, and total by ₱8,500.
--
-- do $$
-- declare
--   v_order public.orders%rowtype;
-- begin
--   select * into v_order from public.orders
--    where status = 'Confirmed'
--    order by created_at desc
--    limit 1;
--
--   if v_order.id is null then
--     raise notice 'No Confirmed order found to seed against.';
--     return;
--   end if;
--
--   insert into public.change_requests
--     (order_id, original_data, requested_data, original_total, requested_total,
--      client_notes, requested_by_name)
--   values (
--     v_order.id,
--     jsonb_build_object('pax', v_order.pax, 'servers', v_order.servers),
--     jsonb_build_object('pax', coalesce(v_order.pax, 0) + 30, 'servers', coalesce(v_order.servers, 8) + 2),
--     v_order.total,
--     v_order.total + 8500,
--     'Adding more guests for the wedding.',
--     'Maria Santos'
--   );
-- end $$;
