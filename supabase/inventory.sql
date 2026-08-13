-- herbies-dashboard — Inventory (ingredients, stock, movements, suppliers)
-- Run AFTER herbies' supabase/schema.sql and supabase/orders.sql (reuses
-- their public.set_updated_at() trigger and public.is_admin() function).
-- Paste into the Supabase SQL Editor and run once; safe to re-run.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  category text not null default '',   -- what they supply, e.g. "Meat & Poultry"
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

alter table public.suppliers enable row level security;

drop policy if exists "Admin manage suppliers" on public.suppliers;
create policy "Admin manage suppliers"
  on public.suppliers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Uncategorized',
  purchase_unit text not null default 'pc',   -- unit bought in, e.g. "sack"
  purchase_qty numeric not null default 1,    -- base units per purchase unit, e.g. 25 (kg per sack)
  base_unit text not null default 'pc',       -- unit stock/costing is tracked in, e.g. "kg"
  unit_cost numeric not null default 0,       -- moving-average cost per base_unit
  reorder_level numeric not null default 0,   -- per-branch threshold, in base_unit
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
  before update on public.ingredients
  for each row
  execute function public.set_updated_at();

alter table public.ingredients enable row level security;

drop policy if exists "Admin manage ingredients" on public.ingredients;
create policy "Admin manage ingredients"
  on public.ingredients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------

create table if not exists public.ingredient_stock (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  branch text not null,   -- cavite | laguna | metro-manila
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (ingredient_id, branch)
);

drop trigger if exists ingredient_stock_set_updated_at on public.ingredient_stock;
create trigger ingredient_stock_set_updated_at
  before update on public.ingredient_stock
  for each row
  execute function public.set_updated_at();

alter table public.ingredient_stock enable row level security;

drop policy if exists "Admin manage ingredient stock" on public.ingredient_stock;
create policy "Admin manage ingredient stock"
  on public.ingredient_stock
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  branch text not null,
  type text not null check (type in ('Receive', 'Usage', 'Adjustment', 'Waste')),
  qty numeric not null,          -- signed: positive increases stock, negative decreases
  unit_cost numeric,             -- cost at time of receipt (Receive only)
  reference text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_created_at_idx on public.stock_movements (created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists "Admin manage stock movements" on public.stock_movements;
create policy "Admin manage stock movements"
  on public.stock_movements
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
