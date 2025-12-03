-- Additional fix for status constraints
-- Drop any CHECK constraints that might exist on orders.status

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all check constraints on orders table that involve 'status'
  FOR constraint_record IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
    AND contype = 'c' 
    AND (conname LIKE '%status%' OR conname LIKE '%orders_%')
  LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
    RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in constraint removal: %', SQLERRM;
END $$;

-- Re-add only the payment_status constraint (which is valid)
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'success', 'failed', 'abandoned', 'reversed'));

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
