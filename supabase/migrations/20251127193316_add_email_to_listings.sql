/*
  # Add Email Field to Listings

  1. Changes
    - Add `contact_email` column to listings table (optional)
  
  2. Notes
    - Email is optional for backwards compatibility
    - Sellers can provide email as alternative contact method
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE listings ADD COLUMN contact_email text;
  END IF;
END $$;