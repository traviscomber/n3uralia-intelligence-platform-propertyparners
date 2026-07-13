-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create neighborhoods table with geometry column
CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  sector_name VARCHAR(255) NOT NULL,
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  velocity_days INTEGER,
  price_per_sqm DECIMAL(10, 2),
  price_trend_3yr DECIMAL(5, 2),
  price_trend_5yr DECIMAL(5, 2),
  absorption_rate DECIMAL(5, 2),
  inventory_count INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_neighborhoods_geometry ON neighborhoods USING GIST (geometry);
CREATE INDEX idx_neighborhoods_name ON neighborhoods(name);

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighborhoods_read_all" ON neighborhoods
  FOR SELECT
  USING (true);

CREATE POLICY "neighborhoods_update_admin" ON neighborhoods
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@propertypartners.com');

CREATE POLICY "neighborhoods_delete_admin" ON neighborhoods
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@propertypartners.com');

CREATE OR REPLACE FUNCTION update_neighborhoods_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER neighborhoods_update_timestamp
BEFORE UPDATE ON neighborhoods
FOR EACH ROW
EXECUTE FUNCTION update_neighborhoods_timestamp();

INSERT INTO neighborhoods (name, sector_name, geometry, velocity_days, price_per_sqm) VALUES
('Vitacura Centro', 'Vitacura Centro', 
  ST_GeomFromText('POLYGON((-70.5935 -33.3834, -70.5915 -33.3834, -70.5915 -33.3854, -70.5935 -33.3854, -70.5935 -33.3834))', 4326),
  45, 8500.00),
('Lo Castillo', 'Lo Castillo',
  ST_GeomFromText('POLYGON((-70.5905 -33.3780, -70.5885 -33.3780, -70.5885 -33.3800, -70.5905 -33.3800, -70.5905 -33.3780))', 4326),
  38, 9200.00),
('Villa El Dorado', 'Villa El Dorado',
  ST_GeomFromText('POLYGON((-70.5960 -33.3750, -70.5940 -33.3750, -70.5940 -33.3770, -70.5960 -33.3770, -70.5960 -33.3750))', 4326),
  52, 10100.00),
('Lo Curro', 'Lo Curro',
  ST_GeomFromText('POLYGON((-70.5875 -33.3820, -70.5855 -33.3820, -70.5855 -33.3840, -70.5875 -33.3840, -70.5875 -33.3820))', 4326),
  35, 9800.00),
('Santa Maria de Manquehue', 'Santa Maria de Manquehue',
  ST_GeomFromText('POLYGON((-70.5845 -33.3850, -70.5825 -33.3850, -70.5825 -33.3870, -70.5845 -33.3870, -70.5845 -33.3850))', 4326),
  40, 9100.00),
('Nueva Costanera', 'Nueva Costanera',
  ST_GeomFromText('POLYGON((-70.6015 -33.3800, -70.5995 -33.3800, -70.5995 -33.3820, -70.6015 -33.3820, -70.6015 -33.3800))', 4326),
  48, 8300.00),
('Jardin del Este', 'Jardin del Este',
  ST_GeomFromText('POLYGON((-70.5820 -33.3900, -70.5800 -33.3900, -70.5800 -33.3920, -70.5820 -33.3920, -70.5820 -33.3900))', 4326),
  42, 8900.00),
('Las Hualtatas', 'Las Hualtatas',
  ST_GeomFromText('POLYGON((-70.5980 -33.3880, -70.5960 -33.3880, -70.5960 -33.3900, -70.5980 -33.3900, -70.5980 -33.3880))', 4326),
  46, 8600.00),
('Las Tranqueras', 'Las Tranqueras',
  ST_GeomFromText('POLYGON((-70.6045 -33.3750, -70.6025 -33.3750, -70.6025 -33.3770, -70.6045 -33.3770, -70.6045 -33.3750))', 4326),
  50, 8200.00),
('Luis Pasteur', 'Luis Pasteur',
  ST_GeomFromText('POLYGON((-70.5890 -33.3900, -70.5870 -33.3900, -70.5870 -33.3920, -70.5890 -33.3920, -70.5890 -33.3900))', 4326),
  44, 8950.00),
('Juan XXIII', 'Juan XXIII',
  ST_GeomFromText('POLYGON((-70.6000 -33.3920, -70.5980 -33.3920, -70.5980 -33.3940, -70.6000 -33.3940, -70.6000 -33.3920))', 4326),
  47, 8750.00),
('Estadio Manquehue', 'Estadio Manquehue',
  ST_GeomFromText('POLYGON((-70.5950 -33.3940, -70.5930 -33.3940, -70.5930 -33.3960, -70.5950 -33.3960, -70.5950 -33.3940))', 4326),
  49, 8400.00)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS properties (
  id BIGSERIAL PRIMARY KEY,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  neighborhood_id BIGINT REFERENCES neighborhoods(id),
  sqm DECIMAL(8, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  quality_score DECIMAL(3, 2),
  construction_year INTEGER,
  list_price DECIMAL(15, 2),
  list_price_uf DECIMAL(10, 2),
  status VARCHAR(50),
  source VARCHAR(100),
  external_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_location ON properties(latitude, longitude);
CREATE INDEX idx_properties_neighborhood_id ON properties(neighborhood_id);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_read_all" ON properties
  FOR SELECT
  USING (true);

CREATE POLICY "properties_insert_auth" ON properties
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "properties_update_auth" ON properties
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE MATERIALIZED VIEW IF NOT EXISTS market_intelligence_summary AS
SELECT 
  n.id,
  n.name,
  n.sector_name,
  COUNT(p.id) as property_count,
  ROUND(AVG(p.list_price_uf)::numeric, 2) as avg_price_uf,
  ROUND(AVG(p.sqm)::numeric, 2) as avg_sqm,
  ROUND(AVG(n.velocity_days)::numeric, 0) as avg_velocity_days,
  n.absorption_rate,
  n.price_trend_5yr,
  n.last_updated
FROM neighborhoods n
LEFT JOIN properties p ON ST_Contains(n.geometry, ST_Point(p.longitude, p.latitude))
GROUP BY n.id, n.name, n.sector_name, n.absorption_rate, n.price_trend_5yr, n.last_updated;

CREATE INDEX idx_market_intel_neighborhood_id ON market_intelligence_summary(id);

COMMIT;
