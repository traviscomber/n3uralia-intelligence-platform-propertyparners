-- Align the production properties table with the scraper payload.
ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_external_id_unique
  ON properties (external_id);
