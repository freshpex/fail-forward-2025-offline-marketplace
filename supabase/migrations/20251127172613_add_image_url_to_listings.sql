/*
  # Add Image Support to Listings

  ## Changes
  1. New Column
    - `image_url` (text, nullable) - Stores the URL or base64-encoded image data for produce items
  
  ## Notes
  - Image URL is optional to maintain backwards compatibility
  - Supports both remote URLs (e.g., stock images from Pexels) and base64 data URIs
  - Maximum size validation should be handled at the application level
  - Recommended formats: JPEG, PNG (max 5MB)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE listings ADD COLUMN image_url text;
  END IF;
END $$;