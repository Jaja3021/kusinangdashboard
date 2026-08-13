-- herbies-dashboard — Costing (recipes & bill-of-materials)
-- Run AFTER herbies' supabase/schema.sql, supabase/orders.sql, AND this
-- project's supabase/inventory.sql (recipe_items references public.ingredients).
-- Reuses public.set_updated_at() and public.is_admin(). Paste into the
-- Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null default '',        -- e.g. "Family", "Regular", "Party Tray"
  category text not null default 'Uncategorized',
  srp numeric not null default 0,       -- suggested retail price
  labor_cost numeric not null default 0,
  overhead_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;

drop policy if exists "Admin manage recipes" on public.recipes;
create policy "Admin manage recipes"
  on public.recipes
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Bill of materials: one row per ingredient line on a recipe. `qty` is in
-- the ingredient's base_unit; `unit_cost` is a snapshot of the ingredient's
-- cost/base_unit at the moment the line was added, so a recipe's COGS
-- doesn't silently drift every time inventory pricing changes.

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  qty numeric not null default 0,
  unit_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists recipe_items_recipe_id_idx on public.recipe_items (recipe_id);

alter table public.recipe_items enable row level security;

drop policy if exists "Admin manage recipe items" on public.recipe_items;
create policy "Admin manage recipe items"
  on public.recipe_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
