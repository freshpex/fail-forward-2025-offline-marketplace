-- Fix payment_status check constraint
-- The existing constraint only allows specific values, but Paystack returns 'success'

-- Drop the existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add a new constraint that includes all Paystack statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'success', 'failed', 'abandoned', 'reversed'));

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
