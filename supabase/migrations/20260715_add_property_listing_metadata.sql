-- Add commercial listing metadata for the Vitacura property inventory.
-- This keeps the scraper output richer for search, cards, and report views.

ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS listing_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_property_type
  ON properties(property_type);

CREATE INDEX IF NOT EXISTS idx_properties_listing_number
  ON properties(listing_number);
