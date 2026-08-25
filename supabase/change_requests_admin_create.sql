-- herbies-dashboard — Admin-initiated change requests
-- Run AFTER supabase/change_requests.sql. Paste into the Supabase SQL
-- Editor and run once; safe to re-run.
--
-- WHAT THIS IS
-- ------------
-- change_requests.sql only lets the Meal Builder (customer-facing) INSERT a
-- row — there is deliberately no admin insert policy, per that file's
-- section 3. This adds the one admin-side entry point: an admin proposing a
-- change themselves (e.g. swapping a dessert dish) from this dashboard,
-- which then goes through the exact same pending -> approve/reject flow as
-- a customer-filed request, via approve_change_request()/
-- reject_change_request() (unchanged, not touched by this file).
--
-- original_data is derived from the LIVE order for every key present in
-- p_requested_data, the same "faithful snapshot at submit time" rule the
-- Meal Builder follows by hand — here it's just automatic, since the admin
-- and the snapshot are the same transaction.

create or replace function public.admin_create_change_request(
  p_order_id uuid,
  p_requested_data jsonb,
  p_requested_total numeric default null,
  p_client_notes text default '',
  p_requested_by_name text default ''
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_original jsonb := '{}'::jsonb;
  v_key text;
  v_req public.change_requests;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  if v_order.status in ('Completed', 'Cancelled') then
    raise exception 'cannot propose a change for a % order', v_order.status;
  end if;

  for v_key in select jsonb_object_keys(p_requested_data) loop
    v_original := v_original || jsonb_build_object(v_key, to_jsonb(v_order) -> v_key);
  end loop;

  begin
    insert into public.change_requests
      (order_id, status, original_data, requested_data, original_total, requested_total,
       client_notes, requested_by, requested_by_name)
    values (
      p_order_id, 'pending', v_original, p_requested_data, v_order.total,
      coalesce(p_requested_total, v_order.total),
      p_client_notes, auth.uid(), p_requested_by_name
    )
    returning * into v_req;
  exception when unique_violation then
    raise exception 'an open change request already exists for this order';
  end;

  return v_req;
end;
$$;

revoke all on function public.admin_create_change_request(uuid, jsonb, numeric, text, text) from public;
grant execute on function public.admin_create_change_request(uuid, jsonb, numeric, text, text) to authenticated;
