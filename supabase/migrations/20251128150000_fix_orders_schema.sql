
-- =============================================
-- FIRST: Fix listings table - backfill seller_id from user_id
-- =============================================
UPDATE public.listings 
SET seller_id = user_id 
WHERE seller_id IS NULL AND user_id IS NOT NULL;
-- =============================================
-- ORDERS TABLE FIXES
-- =============================================

-- Add missing columns with defaults
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text default 'NGN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_quote jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS produce_price numeric(12,2) DEFAULT 0;

-- Make buyer_id nullable to allow guest checkout
DO $$
BEGIN
    ALTER TABLE public.orders ALTER COLUMN buyer_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    NULL; -- ignore if already nullable
END $$;

-- Make quantity and produce_price nullable or have defaults
DO $$
BEGIN
    ALTER TABLE public.orders ALTER COLUMN quantity SET DEFAULT 1;
    ALTER TABLE public.orders ALTER COLUMN quantity DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.orders ALTER COLUMN produce_price SET DEFAULT 0;
    ALTER TABLE public.orders ALTER COLUMN produce_price DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Backfill any existing rows missing order_reference
UPDATE public.orders 
SET order_reference = 'ORD-' || upper(to_hex(extract(epoch from created_at)::int)) || '-' || upper(substring(id::text, 1, 6))
WHERE order_reference IS NULL;

-- Set default for order_reference for future inserts
ALTER TABLE public.orders ALTER COLUMN order_reference SET DEFAULT ('ORD-' || upper(to_hex(extract(epoch from now())::int)) || '-' || upper(substring(gen_random_uuid()::text, 1, 6)));

-- Add delivery_method if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_method') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_method text check (delivery_method in ('manual', 'in_app'));
    END IF;
END $$;

-- =============================================
-- SUPPORTING TABLES
-- =============================================

-- Ensure manual_orders table exists
CREATE TABLE IF NOT EXISTS public.manual_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  instructions text,
  scheduled_date timestamptz,
  created_at timestamptz default timezone('utc', now())
);

-- Ensure shipment_intents table exists
CREATE TABLE IF NOT EXISTS public.shipment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  quote_id text,
  carrier_id text,
  service_code text,
  total_cost numeric(12,2),
  currency text default 'NGN',
  status text default 'pending',
  provider text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
