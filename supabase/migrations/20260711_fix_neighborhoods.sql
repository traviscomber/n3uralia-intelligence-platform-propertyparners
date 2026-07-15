-- FIXED: Simplified neighborhoods table creation
-- This version keeps the dataset strictly focused on Vitacura

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  sector_name VARCHAR(255),
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  velocity_days INTEGER DEFAULT 52,
  price_per_sqm NUMERIC(10, 2),
  price_trend_3yr NUMERIC(5, 2),
  price_trend_5yr NUMERIC(5, 2),
  absorption_rate NUMERIC(5, 2),
  inventory_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_geometry ON neighborhoods USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name ON neighborhoods(name);

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS neighborhoods_read_all ON neighborhoods;
CREATE POLICY neighborhoods_read_all ON neighborhoods
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS neighborhoods_updated_at ON neighborhoods;
CREATE TRIGGER neighborhoods_updated_at
  BEFORE UPDATE ON neighborhoods
  FOR EACH ROW
  EXECUTE FUNCTION updated_at_trigger();

INSERT INTO neighborhoods (name, sector_name, geometry, velocity_days, price_per_sqm, absorption_rate, inventory_count)
VALUES
  (
    'Vitacura Centro',
    'Vitacura Centro',
    ST_GeomFromText('POLYGON((-70.5935 -33.3834, -70.5915 -33.3834, -70.5915 -33.3854, -70.5935 -33.3854, -70.5935 -33.3834))', 4326),
    48,
    8500.00,
    0.85,
    45
  ),
  (
    'Lo Castillo',
    'Lo Castillo',
    ST_GeomFromText('POLYGON((-70.5905 -33.3780, -70.5885 -33.3780, -70.5885 -33.3800, -70.5905 -33.3800, -70.5905 -33.3780))', 4326),
    45,
    9200.00,
    0.88,
    52
  ),
  (
    'Villa El Dorado',
    'Villa El Dorado',
    ST_GeomFromText('POLYGON((-70.5960 -33.3750, -70.5940 -33.3750, -70.5940 -33.3770, -70.5960 -33.3770, -70.5960 -33.3750))', 4326),
    55,
    7800.00,
    0.78,
    38
  ),
  (
    'Lo Curro',
    'Lo Curro',
    ST_GeomFromText('POLYGON((-70.5875 -33.3820, -70.5855 -33.3820, -70.5855 -33.3840, -70.5875 -33.3840, -70.5875 -33.3820))', 4326),
    50,
    8900.00,
    0.82,
    40
  ),
  (
    'Santa Maria de Manquehue',
    'Santa Maria de Manquehue',
    ST_GeomFromText('POLYGON((-70.5845 -33.3850, -70.5825 -33.3850, -70.5825 -33.3870, -70.5845 -33.3870, -70.5845 -33.3850))', 4326),
    58,
    7500.00,
    0.75,
    28
  ),
  (
    'Nueva Costanera',
    'Nueva Costanera',
    ST_GeomFromText('POLYGON((-70.6015 -33.3800, -70.5995 -33.3800, -70.5995 -33.3820, -70.6015 -33.3820, -70.6015 -33.3800))', 4326),
    60,
    6900.00,
    0.70,
    22
  ),
  (
    'Jardin del Este',
    'Jardin del Este',
    ST_GeomFromText('POLYGON((-70.5820 -33.3900, -70.5800 -33.3900, -70.5800 -33.3920, -70.5820 -33.3920, -70.5820 -33.3900))', 4326),
    52,
    8100.00,
    0.80,
    35
  ),
  (
    'Las Hualtatas',
    'Las Hualtatas',
    ST_GeomFromText('POLYGON((-70.5980 -33.3880, -70.5960 -33.3880, -70.5960 -33.3900, -70.5980 -33.3900, -70.5980 -33.3880))', 4326),
    49,
    8700.00,
    0.84,
    48
  ),
  (
    'Las Tranqueras',
    'Las Tranqueras',
    ST_GeomFromText('POLYGON((-70.6045 -33.3750, -70.6025 -33.3750, -70.6025 -33.3770, -70.6045 -33.3770, -70.6045 -33.3750))', 4326),
    65,
    6500.00,
    0.65,
    18
  ),
  (
    'Luis Pasteur',
    'Luis Pasteur',
    ST_GeomFromText('POLYGON((-70.5890 -33.3900, -70.5870 -33.3900, -70.5870 -33.3920, -70.5890 -33.3920, -70.5890 -33.3900))', 4326),
    51,
    8300.00,
    0.83,
    42
  ),
  (
    'Juan XXIII',
    'Juan XXIII',
    ST_GeomFromText('POLYGON((-70.6000 -33.3920, -70.5980 -33.3920, -70.5980 -33.3940, -70.6000 -33.3940, -70.6000 -33.3920))', 4326),
    54,
    8000.00,
    0.79,
    36
  ),
  (
    'Estadio Manquehue',
    'Estadio Manquehue',
    ST_GeomFromText('POLYGON((-70.5950 -33.3940, -70.5930 -33.3940, -70.5930 -33.3960, -70.5950 -33.3960, -70.5950 -33.3940))', 4326),
    53,
    8200.00,
    0.81,
    44
  )
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION get_neighborhood_by_point(lat NUMERIC, lng NUMERIC)
RETURNS TABLE(id BIGINT, name TEXT, sector_name TEXT, velocity_days INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.name, n.sector_name, n.velocity_days
  FROM neighborhoods n
  WHERE ST_Contains(n.geometry, ST_Point(lng, lat)::GEOMETRY)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW market_intelligence_summary AS
SELECT 
  id,
  name,
  sector_name,
  velocity_days,
  price_per_sqm,
  price_trend_3yr,
  price_trend_5yr,
  absorption_rate,
  inventory_count,
  last_updated
FROM neighborhoods
ORDER BY velocity_days ASC;

GRANT SELECT ON neighborhoods TO anon, authenticated;
GRANT SELECT ON market_intelligence_summary TO anon, authenticated;
