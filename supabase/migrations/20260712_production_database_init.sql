-- ============================================================================
-- PRODUCTION DATABASE INITIALIZATION - N3URALIA PROPERTY PARTNERS PLATFORM
-- ============================================================================
-- This migration sets up the complete production database schema with all
-- tables, indexes, RLS policies, and helper functions.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- NEIGHBORHOODS TABLE - Core geographic and market data
-- ============================================================================

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
  zona_prc VARCHAR(100),
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_geometry ON neighborhoods USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name ON neighborhoods(name);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_sector ON neighborhoods(sector_name);

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS neighborhoods_read_all ON neighborhoods;
CREATE POLICY neighborhoods_read_all ON neighborhoods FOR SELECT USING (true);

-- ============================================================================
-- PROPERTIES TABLE - Individual property listings
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  id BIGSERIAL PRIMARY KEY,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  neighborhood_id BIGINT REFERENCES neighborhoods(id) ON DELETE SET NULL,
  
  -- Property details
  area_m2 NUMERIC(8, 2),
  sqm NUMERIC(8, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  quality_score NUMERIC(3, 2),
  construction_year INTEGER,
  
  -- Market data
  list_price NUMERIC(15, 2),
  list_price_uf NUMERIC(10, 2),
  price_uf NUMERIC(10, 2),
  status VARCHAR(50) DEFAULT 'available',
  
  -- Days on market tracking
  days_on_market INTEGER,
  
  -- Source tracking
  source VARCHAR(100),
  external_id VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood_id ON properties(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);
CREATE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS properties_read_all ON properties;
CREATE POLICY properties_read_all ON properties FOR SELECT USING (true);

-- ============================================================================
-- VITACURA_PRC_ZONES TABLE - PRC zoning data
-- ============================================================================

CREATE TABLE IF NOT EXISTS vitacura_prc_zones (
  id BIGSERIAL PRIMARY KEY,
  zona VARCHAR(100) NOT NULL,
  subzona VARCHAR(100),
  uso_suelo VARCHAR(200),
  geometry GEOMETRY(POLYGON, 4326),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prc_zones_geometry ON vitacura_prc_zones USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_prc_zones_zona ON vitacura_prc_zones(zona);

ALTER TABLE vitacura_prc_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prc_zones_read_all ON vitacura_prc_zones;
CREATE POLICY prc_zones_read_all ON vitacura_prc_zones FOR SELECT USING (true);

-- ============================================================================
-- MARKET DATA TABLE - Historical market snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_data (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT REFERENCES neighborhoods(id) ON DELETE CASCADE,
  
  avg_price_uf NUMERIC(10, 2),
  avg_price_m2_uf NUMERIC(10, 2),
  inventory_count INTEGER,
  absorption_rate NUMERIC(5, 2),
  
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_data_neighborhood_id ON market_data(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_market_data_snapshot_date ON market_data(snapshot_date DESC);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS market_data_read_all ON market_data;
CREATE POLICY market_data_read_all ON market_data FOR SELECT USING (true);

-- ============================================================================
-- KPI SNAPSHOTS TABLE - Key performance indicators over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id BIGSERIAL PRIMARY KEY,
  
  ventas_count INTEGER DEFAULT 0,
  ventas_uf NUMERIC(15, 2) DEFAULT 0,
  captaciones INTEGER DEFAULT 0,
  visitas INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  comision NUMERIC(15, 2) DEFAULT 0,
  
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date ON kpi_snapshots(snapshot_date DESC);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_snapshots_read_all ON kpi_snapshots;
CREATE POLICY kpi_snapshots_read_all ON kpi_snapshots FOR SELECT USING (true);

-- ============================================================================
-- AI REPORTS TABLE - Generated weekly director reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_reports (
  id BIGSERIAL PRIMARY KEY,
  
  title VARCHAR(500),
  summary TEXT,
  report_type VARCHAR(100),
  period_date DATE,
  content JSONB,
  generated_by VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_period_date ON ai_reports(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_report_type ON ai_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON ai_reports(created_at DESC);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_reports_read_all ON ai_reports;
CREATE POLICY ai_reports_read_all ON ai_reports FOR SELECT USING (true);

-- ============================================================================
-- SCRAPE RUNS TABLE - Audit trail for scraper executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS scrape_runs (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  scraped_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_created_at ON scrape_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs(source, created_at DESC);

ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scrape_runs_read_all ON scrape_runs;
CREATE POLICY scrape_runs_read_all ON scrape_runs FOR SELECT USING (true);

-- ============================================================================
-- PROFILES TABLE - User information
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'viewer',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_read_own ON profiles;
CREATE POLICY profiles_read_own ON profiles FOR SELECT USING (auth.uid() = id OR true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS neighborhoods_updated_at ON neighborhoods;
CREATE TRIGGER neighborhoods_updated_at BEFORE UPDATE ON neighborhoods FOR EACH ROW EXECUTE FUNCTION updated_at_trigger();

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION updated_at_trigger();

DROP TRIGGER IF EXISTS market_data_updated_at ON market_data;
CREATE TRIGGER market_data_updated_at BEFORE UPDATE ON market_data FOR EACH ROW EXECUTE FUNCTION updated_at_trigger();

DROP TRIGGER IF EXISTS ai_reports_updated_at ON ai_reports;
CREATE TRIGGER ai_reports_updated_at BEFORE UPDATE ON ai_reports FOR EACH ROW EXECUTE FUNCTION updated_at_trigger();

-- Function to get neighborhood by point
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

-- Function to tag property with neighborhood and PRC zone
CREATE OR REPLACE FUNCTION tag_vitacura_point(p_lat NUMERIC, p_lng NUMERIC)
RETURNS TABLE(neighborhood_id BIGINT, neighborhood_name TEXT, zona_prc TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.name,
    z.zona
  FROM neighborhoods n
  LEFT JOIN vitacura_prc_zones z ON ST_Contains(z.geometry, ST_Point(p_lng, p_lat)::GEOMETRY)
  WHERE ST_Contains(n.geometry, ST_Point(p_lng, p_lat)::GEOMETRY)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get neighborhoods as GeoJSON
CREATE OR REPLACE FUNCTION get_neighborhoods_geojson()
RETURNS TABLE(geojson JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'type', 'Feature',
    'geometry', ST_AsGeoJSON(n.geometry)::jsonb,
    'properties', jsonb_build_object(
      'id', n.id,
      'name', n.name,
      'sector_name', n.sector_name,
      'velocity_days', n.velocity_days,
      'price_per_sqm', n.price_per_sqm,
      'absorption_rate', n.absorption_rate,
      'inventory_count', n.inventory_count
    )
  )
  FROM neighborhoods n;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Market Intelligence Summary View
CREATE OR REPLACE VIEW market_intelligence_summary AS
SELECT 
  n.id,
  n.name,
  n.sector_name,
  COUNT(p.id) as property_count,
  ROUND(AVG(p.list_price_uf)::numeric, 2) as avg_price_uf,
  ROUND(AVG(p.area_m2)::numeric, 2) as avg_area_m2,
  n.velocity_days,
  n.absorption_rate,
  n.price_trend_5yr,
  n.last_updated
FROM neighborhoods n
LEFT JOIN properties p ON n.id = p.neighborhood_id
GROUP BY n.id, n.name, n.sector_name, n.velocity_days, n.absorption_rate, n.price_trend_5yr, n.last_updated
ORDER BY n.velocity_days ASC;

-- ============================================================================
-- SEED DATA - 12 Vitacura neighborhoods
-- ============================================================================

INSERT INTO neighborhoods (name, sector_name, geometry, velocity_days, price_per_sqm, absorption_rate, inventory_count)
VALUES
  ('Vitacura Centro', 'Centro', ST_GeomFromText('POLYGON((-70.5935 -33.3834, -70.5915 -33.3834, -70.5915 -33.3854, -70.5935 -33.3854, -70.5935 -33.3834))', 4326), 48, 8500.00, 0.85, 45),
  ('El Golf', 'Golf', ST_GeomFromText('POLYGON((-70.5905 -33.3780, -70.5885 -33.3780, -70.5885 -33.3800, -70.5905 -33.3800, -70.5905 -33.3780))', 4326), 45, 9200.00, 0.88, 52),
  ('La Dehesa', 'Dehesa', ST_GeomFromText('POLYGON((-70.5960 -33.3750, -70.5940 -33.3750, -70.5940 -33.3770, -70.5960 -33.3770, -70.5960 -33.3750))', 4326), 55, 7800.00, 0.78, 38),
  ('Nueva Costanera', 'Costanera', ST_GeomFromText('POLYGON((-70.5875 -33.3820, -70.5855 -33.3820, -70.5855 -33.3840, -70.5875 -33.3840, -70.5875 -33.3820))', 4326), 50, 8900.00, 0.82, 40),
  ('Costanera Sur', 'Sur', ST_GeomFromText('POLYGON((-70.5845 -33.3850, -70.5825 -33.3850, -70.5825 -33.3870, -70.5845 -33.3870, -70.5845 -33.3850))', 4326), 58, 7500.00, 0.75, 28),
  ('Cerro San Cristóbal', 'Cerro', ST_GeomFromText('POLYGON((-70.6015 -33.3800, -70.5995 -33.3800, -70.5995 -33.3820, -70.6015 -33.3820, -70.6015 -33.3800))', 4326), 60, 6900.00, 0.70, 22),
  ('La Florida', 'Florida', ST_GeomFromText('POLYGON((-70.5820 -33.3900, -70.5800 -33.3900, -70.5800 -33.3920, -70.5820 -33.3920, -70.5820 -33.3900))', 4326), 52, 8100.00, 0.80, 35),
  ('Andrés Bello', 'Bello', ST_GeomFromText('POLYGON((-70.5980 -33.3880, -70.5960 -33.3880, -70.5960 -33.3900, -70.5980 -33.3900, -70.5980 -33.3880))', 4326), 49, 8700.00, 0.84, 48),
  ('Huérfanos', 'Huérfanos', ST_GeomFromText('POLYGON((-70.6045 -33.3750, -70.6025 -33.3750, -70.6025 -33.3770, -70.6045 -33.3770, -70.6045 -33.3750))', 4326), 65, 6500.00, 0.65, 18),
  ('Apoquindo Alto', 'Alto', ST_GeomFromText('POLYGON((-70.5890 -33.3900, -70.5870 -33.3900, -70.5870 -33.3920, -70.5890 -33.3920, -70.5890 -33.3900))', 4326), 51, 8300.00, 0.83, 42),
  ('Alonso de Córdova', 'Córdova', ST_GeomFromText('POLYGON((-70.6000 -33.3920, -70.5980 -33.3920, -70.5980 -33.3940, -70.6000 -33.3940, -70.6000 -33.3920))', 4326), 54, 8000.00, 0.79, 36),
  ('Manquehue', 'Manquehue', ST_GeomFromText('POLYGON((-70.5950 -33.3940, -70.5930 -33.3940, -70.5930 -33.3960, -70.5950 -33.3960, -70.5950 -33.3940))', 4326), 53, 8200.00, 0.81, 44)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- INITIAL KPI SNAPSHOT
-- ============================================================================

INSERT INTO kpi_snapshots (ventas_count, ventas_uf, captaciones, visitas, leads, comision)
VALUES (0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANTS FOR PUBLIC SCHEMA ACCESS
-- ============================================================================

GRANT SELECT ON neighborhoods TO anon, authenticated;
GRANT SELECT ON properties TO anon, authenticated;
GRANT SELECT ON market_data TO anon, authenticated;
GRANT SELECT ON kpi_snapshots TO anon, authenticated;
GRANT SELECT ON ai_reports TO anon, authenticated;
GRANT SELECT ON scrape_runs TO anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON market_intelligence_summary TO anon, authenticated;

-- ============================================================================
-- FINALIZE
-- ============================================================================

COMMIT;
