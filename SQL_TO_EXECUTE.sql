-- Execute this SQL in Supabase Dashboard → SQL Editor
-- This creates the neighborhoods table with all required fields

CREATE EXTENSION IF NOT EXISTS postgis;

-- Create neighborhoods table
CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  sector_name VARCHAR(255),
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  
  -- Market intelligence fields
  velocity_days INTEGER DEFAULT 52,
  price_per_sqm NUMERIC(10, 2),
  price_trend_3yr NUMERIC(5, 2),
  price_trend_5yr NUMERIC(5, 2),
  absorption_rate NUMERIC(5, 2),
  inventory_count INTEGER DEFAULT 0,
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_neighborhoods_geometry ON neighborhoods USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name ON neighborhoods(name);

-- Enable RLS
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS neighborhoods_read_all ON neighborhoods;
CREATE POLICY neighborhoods_read_all ON neighborhoods
  FOR SELECT
  USING (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Populate 12 Vitacura sectors
INSERT INTO neighborhoods (name, sector_name, geometry, velocity_days, price_per_sqm, absorption_rate, inventory_count)
VALUES
  ('Vitacura Centro', 'Centro', ST_GeomFromText('POLYGON((-70.5935 -33.3834, -70.5915 -33.3834, -70.5915 -33.3854, -70.5935 -33.3854, -70.5935 -33.3834))', 4326), 48, 8500.00, 0.85, 45),
  ('El Golf', 'Golf', ST_GeomFromText('POLYGON((-70.5905 -33.3780, -70.5885 -33.3780, -70.5885 -33.3800, -70.5905 -33.3800, -70.5905 -33.3780))', 4326), 45, 9200.00, 0.88, 52),
  ('La Dehesa', 'Dehesa', ST_GeomFromText('POLYGON((-70.5960 -33.3750, -70.5940 -33.3750, -70.5940 -33.3770, -70.5960 -33.3770, -70.5960 -33.3750))', 4326), 55, 7800.00, 0.78, 38),
  ('Nueva Costanera', 'Costanera', ST_GeomFromText('POLYGON((-70.5875 -33.3820, -70.5855 -33.3820, -70.5855 -33.3840, -70.5875 -33.3840, -70.5875 -33.3820))', 4326), 40, 9500.00, 0.90, 58),
  ('Costanera Sur', 'Sur', ST_GeomFromText('POLYGON((-70.5845 -33.3850, -70.5825 -33.3850, -70.5825 -33.3870, -70.5845 -33.3870, -70.5845 -33.3850))', 4326), 50, 8800.00, 0.82, 42),
  ('Cerro San Cristóbal', 'Cerro', ST_GeomFromText('POLYGON((-70.6015 -33.3800, -70.5995 -33.3800, -70.5995 -33.3820, -70.6015 -33.3820, -70.6015 -33.3800))', 4326), 60, 7200.00, 0.72, 28),
  ('La Florida', 'Florida', ST_GeomFromText('POLYGON((-70.5820 -33.3900, -70.5800 -33.3900, -70.5800 -33.3920, -70.5820 -33.3920, -70.5820 -33.3900))', 4326), 62, 6800.00, 0.68, 25),
  ('Andrés Bello', 'Bello', ST_GeomFromText('POLYGON((-70.5980 -33.3880, -70.5960 -33.3880, -70.5960 -33.3900, -70.5980 -33.3900, -70.5980 -33.3880))', 4326), 46, 8900.00, 0.86, 48),
  ('Huérfanos', 'Huérfanos', ST_GeomFromText('POLYGON((-70.6045 -33.3750, -70.6025 -33.3750, -70.6025 -33.3770, -70.6045 -33.3770, -70.6045 -33.3750))', 4326), 58, 7500.00, 0.75, 35),
  ('Apoquindo Alto', 'Apoquindo', ST_GeomFromText('POLYGON((-70.5890 -33.3900, -70.5870 -33.3900, -70.5870 -33.3920, -70.5890 -33.3920, -70.5890 -33.3900))', 4326), 44, 9100.00, 0.87, 50),
  ('Alonso de Córdova', 'Córdova', ST_GeomFromText('POLYGON((-70.6000 -33.3920, -70.5980 -33.3920, -70.5980 -33.3940, -70.6000 -33.3940, -70.6000 -33.3920))', 4326), 52, 8300.00, 0.80, 40),
  ('Manquehue', 'Manquehue', ST_GeomFromText('POLYGON((-70.5950 -33.3940, -70.5930 -33.3940, -70.5930 -33.3960, -70.5950 -33.3960, -70.5950 -33.3940))', 4326), 54, 8000.00, 0.79, 39)
ON CONFLICT (name) DO NOTHING;

-- Verify the data was inserted
SELECT COUNT(*) as total_neighborhoods FROM neighborhoods;
