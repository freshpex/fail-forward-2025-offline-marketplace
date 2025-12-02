-- Introduce packaging context for listings
alter table if exists public.listings
  add column if not exists package_type text;

alter table if exists public.listings
  add column if not exists measurement_unit text;

alter table if exists public.listings
  add column if not exists measurement_value numeric(12,2);

alter table if exists public.listings
  add column if not exists unit_description text;

-- Backfill package_type for existing rows
update public.listings
set package_type = coalesce(package_type, unit)
where package_type is distinct from unit;
