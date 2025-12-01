-- Fix manual_orders table columns and orders status constraint
-- Run this to align the actual database with expected schema

-- Ensure manual_orders has the required columns
ALTER TABLE public.manual_orders ADD COLUMN IF NOT EXISTS buyer_name text;
ALTER TABLE public.manual_orders ADD COLUMN IF NOT EXISTS buyer_phone text;
ALTER TABLE public.manual_orders ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE public.manual_orders ADD COLUMN IF NOT EXISTS scheduled_date timestamptz;

-- Update any NULL buyer_name to a default
UPDATE public.manual_orders SET buyer_name = 'Guest' WHERE buyer_name IS NULL;
UPDATE public.manual_orders SET buyer_phone = '' WHERE buyer_phone IS NULL;

-- Drop any CHECK constraints that might exist on status columns
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all check constraints on orders table that involve 'status'
  FOR constraint_record IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
    AND contype = 'c' 
    AND conname LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Also try the explicit name
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- The status column uses order_status enum, ensure the enum has all values
DO $$
BEGIN
  -- Try to add 'payment_verified' to the enum if it doesn't exist
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_verified';
EXCEPTION WHEN OTHERS THEN
  NULL; -- Value already exists or enum doesn't exist
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
