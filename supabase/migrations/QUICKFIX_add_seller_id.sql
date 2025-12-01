-- Quick fix to add seller_id and new columns to listings table

-- Add seller_id column and foreign key
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id);

-- Add pickup/scheduling columns
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS pickup_address text,
ADD COLUMN IF NOT EXISTS pickup_city text,
ADD COLUMN IF NOT EXISTS pickup_state text,
ADD COLUMN IF NOT EXISTS harvest_date date,
ADD COLUMN IF NOT EXISTS preferred_schedule text;

-- Backfill seller_id from user_id for legacy listings
UPDATE public.listings 
SET seller_id = user_id 
WHERE seller_id IS NULL AND user_id IS NOT NULL;

-- Create index for seller lookups
CREATE INDEX IF NOT EXISTS listings_seller_idx ON public.listings(seller_id);

