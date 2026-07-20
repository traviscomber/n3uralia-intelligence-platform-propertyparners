-- Persist scraped listing descriptions for Vitacura inventory.

ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS description TEXT;
