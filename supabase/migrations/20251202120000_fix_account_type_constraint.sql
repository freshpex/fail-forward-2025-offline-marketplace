-- Fix seller_payment_accounts account_type check constraint
-- The constraint is rejecting valid Paystack account types like 'nuban'

-- Drop the existing check constraint
DO $$
BEGIN
  ALTER TABLE public.seller_payment_accounts 
    DROP CONSTRAINT IF EXISTS seller_payment_accounts_account_type_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop constraint: %', SQLERRM;
END $$;

-- Add a new constraint that includes all valid Paystack account types
-- 'nuban' = Nigerian Uniform Bank Account Number (most common for Nigerian banks)
-- 'mobile_money' = Mobile money accounts
-- 'basa' = Bank Account South Africa
-- 'authorization' = Paystack authorization
ALTER TABLE public.seller_payment_accounts 
  ADD CONSTRAINT seller_payment_accounts_account_type_check 
  CHECK (account_type IS NULL OR account_type IN ('nuban', 'mobile_money', 'basa', 'authorization', 'bank'));

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
