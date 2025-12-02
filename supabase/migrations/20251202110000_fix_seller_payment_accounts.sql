-- Fix seller_payment_accounts table - account_type column issue
-- The account_type column exists in production with NOT NULL constraint but is not in migrations
-- This migration ensures the column exists with a proper default value

-- Add account_type column if it doesn't exist (with default value)
ALTER TABLE public.seller_payment_accounts 
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'nuban';

-- If the column already exists, ensure it has a default value
DO $$
BEGIN
  -- Set default value for the column
  ALTER TABLE public.seller_payment_accounts 
    ALTER COLUMN account_type SET DEFAULT 'nuban';
  
  -- Update any NULL values to the default
  UPDATE public.seller_payment_accounts 
    SET account_type = 'nuban' 
    WHERE account_type IS NULL;
    
  -- Make it nullable to avoid constraint issues (or keep NOT NULL with default)
  -- We're making it NOT NULL with a default, which is safer
  ALTER TABLE public.seller_payment_accounts 
    ALTER COLUMN account_type SET NOT NULL;
    
EXCEPTION WHEN OTHERS THEN
  -- Column might not exist yet, which is fine
  RAISE NOTICE 'Could not alter account_type: %', SQLERRM;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
