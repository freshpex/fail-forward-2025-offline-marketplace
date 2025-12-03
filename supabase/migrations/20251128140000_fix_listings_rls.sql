-- Update RLS policies to allow access based on seller_id OR user_id
-- This migration is idempotent - it safely drops and recreates policies

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own listings via seller_id" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings via seller_id" ON public.listings;
DROP POLICY IF EXISTS "Users can view their own listings via seller_id" ON public.listings;
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.listings;

-- Enable RLS on listings if not already enabled
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Policy for reading listings: Everyone can view all listings (public marketplace)
CREATE POLICY "Public listings are viewable by everyone"
ON public.listings
FOR SELECT
USING (true);

-- Policy for inserting listings: Authenticated users can create listings
CREATE POLICY "Users can insert their own listings"
ON public.listings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (seller_id = auth.uid() OR seller_id IS NULL)
);

-- Policy for Updating listings via seller_id OR user_id (for legacy support)
CREATE POLICY "Users can update their own listings via seller_id"
ON public.listings
FOR UPDATE
USING (
  auth.uid() = seller_id OR auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = seller_id OR auth.uid() = user_id
);

-- Policy for Deleting listings via seller_id OR user_id (for legacy support)
CREATE POLICY "Users can delete their own listings via seller_id"
ON public.listings
FOR DELETE
USING (
  auth.uid() = seller_id OR auth.uid() = user_id
);
