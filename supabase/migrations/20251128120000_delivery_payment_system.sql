-- Delivery and payment system rebuild (2025-11-28)
-- This migration aligns the schema with the Supabase Edge Function architecture

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending_payment',
      'payment_verified',
      'ready_for_pickup',
      'in_transit',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipment_status') then
    create type public.shipment_status as enum (
      'pending',
      'booked',
      'in_transit',
      'delivered',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum (
      'pending',
      'approved',
      'rejected'
    );
  end if;
end
$$;

-- Ensure listings table is associated with sellers
alter table if exists public.listings
  add column if not exists seller_id uuid references auth.users(id);

alter table if exists public.listings
  add column if not exists pickup_address text;

alter table if exists public.listings
  add column if not exists pickup_city text;

alter table if exists public.listings
  add column if not exists pickup_state text;

alter table if exists public.listings
  add column if not exists harvest_date date;

alter table if exists public.listings
  add column if not exists preferred_schedule text;

-- Backfill seller_id from user_id for legacy listings
UPDATE public.listings 
SET seller_id = user_id 
WHERE seller_id IS NULL AND user_id IS NOT NULL;

-- Profiles table keeps role and verification state
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  seller_verified boolean default false,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.seller_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  paystack_recipient_code text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid not null references auth.users(id) on delete set null,
  order_reference text not null default ('ORD-' || upper(to_hex(extract(epoch from now())::int)) || '-' || upper(substring(gen_random_uuid()::text, 1, 6))),
  quantity integer not null default 1,
  produce_price numeric(12,2) default 0,
  status public.order_status not null default 'pending_payment',
  delivery_method text not null check (delivery_method in ('manual', 'in_app')),
  delivery_quote jsonb,
  total_amount numeric(12,2),
  currency text default 'NGN',
  payment_reference text,
  payment_status text,
  shipping_provider text,
  metadata jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.manual_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  instructions text,
  scheduled_date date,
  created_at timestamptz default timezone('utc', now())
);

-- Add order_id column to manual_orders if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'manual_orders' and column_name = 'order_id') then
    alter table public.manual_orders add column order_id uuid references public.orders(id) on delete cascade;
    alter table public.manual_orders alter column order_id set not null;
  end if;
end
$$;

create table if not exists public.shipment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  quote_id text,
  provider text,
  request_payload jsonb,
  response_payload jsonb,
  status text default 'pending',
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_intent_id uuid references public.shipment_intents(id) on delete cascade,
  tracking_number text,
  status public.shipment_status default 'pending',
  eta timestamptz,
  provider text,
  metadata jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

-- Add columns to existing shipments table if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shipments' and column_name = 'shipment_intent_id') then
    alter table public.shipments add column shipment_intent_id uuid references public.shipment_intents(id) on delete cascade;
  end if;
end
$$;

create table if not exists public.seller_verification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_url text not null,
  document_type text,
  status public.verification_status default 'pending',
  rejection_reason text,
  submitted_at timestamptz default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

drop trigger if exists seller_payment_accounts_set_updated_at on public.seller_payment_accounts;
create trigger seller_payment_accounts_set_updated_at
  before update on public.seller_payment_accounts
  for each row execute function public.handle_updated_at();

drop trigger if exists shipment_intents_set_updated_at on public.shipment_intents;
create trigger shipment_intents_set_updated_at
  before update on public.shipment_intents
  for each row execute function public.handle_updated_at();

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.handle_updated_at();

-- Useful indexes for lookups
create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_seller_idx on public.orders (seller_id);
create index if not exists orders_listing_idx on public.orders (listing_id);
create index if not exists shipments_intent_idx on public.shipments (shipment_intent_id);
create index if not exists shipment_intents_order_idx on public.shipment_intents (order_id);
create index if not exists seller_verification_user_idx on public.seller_verification (user_id);
create index if not exists seller_payment_accounts_user_idx on public.seller_payment_accounts (user_id);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.manual_orders enable row level security;
alter table public.shipment_intents enable row level security;
alter table public.shipments enable row level security;
alter table public.seller_verification enable row level security;
alter table public.seller_payment_accounts enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists orders_participant_read on public.orders;
create policy orders_participant_read
  on public.orders for select
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists manual_orders_participant_read on public.manual_orders;
create policy manual_orders_participant_read
  on public.manual_orders for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = manual_orders.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists shipment_intents_participant_read on public.shipment_intents;
create policy shipment_intents_participant_read
  on public.shipment_intents for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = shipment_intents.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists shipments_participant_read on public.shipments;
create policy shipments_participant_read
  on public.shipments for select
  using (
    exists (
      select 1
      from public.shipment_intents si
      join public.orders o on o.id = si.order_id
      where si.id = shipments.shipment_intent_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists seller_verification_owner_read on public.seller_verification;
create policy seller_verification_owner_read
  on public.seller_verification for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists seller_payment_accounts_owner_read on public.seller_payment_accounts;
create policy seller_payment_accounts_owner_read
  on public.seller_payment_accounts for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists seller_payment_accounts_owner_write on public.seller_payment_accounts;
create policy seller_payment_accounts_owner_write
  on public.seller_payment_accounts for insert
  with check (user_id = auth.uid());

drop policy if exists seller_payment_accounts_owner_update on public.seller_payment_accounts;
create policy seller_payment_accounts_owner_update
  on public.seller_payment_accounts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
