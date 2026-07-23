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

-- No neighborhoods are seeded here. Geometry and metrics must come from the
-- audited KML and market-source ingestion pipeline.

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
