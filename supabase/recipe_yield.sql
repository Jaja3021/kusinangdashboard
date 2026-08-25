-- herbies-dashboard — recipe yield & dish linkage
-- Run AFTER this project's supabase/inventory.sql and supabase/costing.sql.
-- Paste into the Supabase SQL Editor and run once; safe to re-run.
--
-- WHY THIS INSTEAD OF A NEW `menu_items` TABLE
-- --------------------------------------------
-- Dishes have no table of their own and shouldn't get one: they live inside
-- public.packages as JSONB (tray_catalog[].name, head_count_menu.mains/sides/
-- snacks, pax_tiers[].menus[]), and an order snapshots them as free-text
-- names in orders.menu_snapshot / orders.selected_dishes / orders.cart. A
-- menu_items table would duplicate packages and immediately drift from it.
--
-- So the join key is the dish NAME, normalized: `dish_key`. public.recipes
-- already carries `name` + `size`, which is exactly a dish and its tray size
-- — this file only adds what requirements planning needs on top:
--
--   basis      how the BOM scales:
--                per_pax   — multiply by the order's pax (catering dishes)
--                per_tray  — multiply by tray qty; `size` picks which row
--                per_piece — multiply by piece count (packed meals)
--   yield_qty  how many pax/trays/pieces one BOM covers. 1 means the BOM
--              lines are already stated per single unit, which is how the
--              seed writes them; an admin entering "one 10 kg batch serves
--              50 pax" sets 50 instead and the math still works out.
--
-- Nothing here changes how /dashboard/costing computes COGS or margin — the
-- new columns are additive and defaulted.

alter table public.recipes add column if not exists dish_key text;

alter table public.recipes add column if not exists basis text not null default 'per_pax';

do $$ begin
  alter table public.recipes add constraint recipes_basis_check
    check (basis in ('per_pax', 'per_tray', 'per_piece'));
exception when duplicate_object then null; end $$;

alter table public.recipes add column if not exists yield_qty numeric not null default 1;

do $$ begin
  alter table public.recipes add constraint recipes_yield_qty_check
    check (yield_qty > 0);
exception when duplicate_object then null; end $$;

-- One recipe per (dish, tray size). Partial so recipes that aren't linked to
-- a storefront dish yet (dish_key null) stay unconstrained — the Costing page
-- has always allowed free-form recipes and still does.
create unique index if not exists recipes_dish_key_size_idx
  on public.recipes (dish_key, size)
  where dish_key is not null;

create index if not exists recipes_dish_key_idx on public.recipes (dish_key);
