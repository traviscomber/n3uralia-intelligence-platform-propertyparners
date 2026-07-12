-- Ensure external_id column exists on properties table
ALTER TABLE IF EXISTS properties ADD COLUMN IF NOT EXISTS external_id VARCHAR(500);

-- Create index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);

-- Create index on source for filtering by scrape source
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);

-- Ensure timestamps are properly set
ALTER TABLE IF EXISTS properties ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS properties ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Verify schema
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'properties'
ORDER BY ordinal_position;
