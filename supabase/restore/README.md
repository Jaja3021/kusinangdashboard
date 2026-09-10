# Restoring Kusinang Pamana's `orders` / `payments`

## What happened

On **2026-08-31 15:35:28 UTC** a seed script belonging to a different app —
"Americana Feast Co." (`public.settings`: USD, New York) — was run against
this Supabase project (`gkskidpjuzscvirlcxnq`). It dropped `public.orders`
with `CASCADE` and recreated `orders` and `payments` with its own
restaurant-ordering schema.

Symptom: signing in appears to fail. It doesn't — auth is fine. The
`/dashboard` page crashes on `getOrders()` with
`column orders.package_name does not exist`, and the crash looks like a
bounced login.

Collateral from the `CASCADE`:

| Object | State |
| --- | --- |
| `public.orders` | replaced by the Americana Feast schema |
| `public.payments` | replaced by the Americana Feast schema |
| `public.lookup_attempts` | gone |
| `change_requests` / `kitchen_stages` / `inventory_reservations` | tables survived, **rows deleted, FK to `orders` dropped** |
| `change_requests` RLS policies referencing `orders` | dropped |
| `packages`, `branches`, `dashboard_profiles`, `admins`, inventory/costing tables | **untouched** |

Kusinang Pamana order and payment *history* in this project is not
recoverable from SQL — only a Supabase PITR / backup restore to before
2026-08-31 15:35 UTC would bring the rows back. The steps below restore the
**schema**, so the dashboard works again, starting from zero orders.

## Run order — Supabase SQL Editor

Run each file top to bottom, one at a time. All are idempotent.

1. `herbies-dashboard/supabase/restore/01_quarantine_americanafeast.sql`
   Moves the 16 Americana Feast tables into an `americanafeast` schema.
   Nothing is deleted; they simply stop colliding with Kusinang Pamana and
   stop being served by PostgREST.

2. `herbies/supabase/orders.sql` — recreates `public.orders`, `admins`,
   `is_admin()`, and the orders RLS policies.

3. `herbies/supabase/payments.sql` — recreates `public.payments`,
   `lookup_attempts`, `next_order_number()`, the
   `recompute_order_payment_state()` trigger, `lookup_order()`,
   `begin_payment()`, `finalize_payment()`, and the payment-proofs storage
   policies. Also adds `orders.deposit_amount / amount_paid /
   payment_status`.

4. `herbies/supabase/rush-fee.sql` — adds `orders.rush_fee`.

5. `herbies/supabase/optional-email.sql` — makes `orders.email` nullable and
   recreates `place_guest_order()`.

6. `herbies/supabase/menu_orders_v2.sql` — widens the `orders_status_check`
   constraint to the 7 statuses this dashboard's status dropdown and Kitchen
   board use (`lib/orders/types.ts`).

7. `herbies-dashboard/supabase/restore/02_orders_missing_columns.sql`
   Adds `orders.servers`, which this dashboard reads and writes but which is
   declared in no schema file in either repo — it had been added by hand in
   the SQL Editor, so a schema-file-driven restore misses it. Ends with a
   SELECT that should return **zero** rows.

8. `herbies-dashboard/supabase/change_requests.sql` — restores the RLS
   policies that referenced `orders` and were dropped by the CASCADE.

9. `herbies-dashboard/supabase/restore/03_relink_orders_fks.sql`
   Re-adds the three foreign keys to `orders`. Ends with a SELECT that
   should return three rows.

### Deliberately NOT re-run

- `herbies/supabase/schema.sql` and `handaan-packages.sql` — `public.packages`
  survived intact (7 rows, ₱ pricing). Re-running would only re-seed.
- `herbies/supabase/change-requests.sql` — its `approve_change_request` is
  the older 2-argument version, and its `lookup_order` uses a bare
  `create function` that errors when one already exists. This dashboard's
  own `supabase/change_requests.sql` (step 7) is the current source of
  truth for that table.

## Afterwards

`getOrders()` returns an empty list and every page renders. To confirm
before opening the app:

```
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders?select=order_number,package_name,event_date&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

`[]` means restored. A `package_name does not exist` error means step 2/3
did not run.

## Preventing a repeat

The Americana Feast app has its own database; its tables do not belong in
this project. After confirming nothing of theirs is still needed here, the
`americanafeast` schema can be dropped with
`drop schema americanafeast cascade;` — a separate, destructive decision,
deliberately not part of these scripts.
