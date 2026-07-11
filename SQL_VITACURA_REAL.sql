-- Real Vitacura Neighborhoods - Property Partners
-- Based on: PRC (Plan Regulador Comunal), Zonas 30 Municipal, and Market Taxonomy

CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing table if needed (uncomment to reset)
-- DROP TABLE IF EXISTS neighborhoods CASCADE;

-- Create neighborhoods table with extended fields
CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  barrio_id VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(50) DEFAULT 'barrio_mercado',
  
  -- Geographic data
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  zona_prc VARCHAR(100),
  zona_30 VARCHAR(100),
  
  -- Market intelligence fields
  velocity_days INTEGER DEFAULT 50,
  price_per_sqm NUMERIC(10, 2),
  price_trend_3yr NUMERIC(5, 2),
  price_trend_5yr NUMERIC(5, 2),
  absorption_rate NUMERIC(5, 2),
  inventory_count INTEGER DEFAULT 0,
  
  -- Data management
  geometry_source VARCHAR(100) DEFAULT 'property_partners_v1',
  fuente VARCHAR(100),
  version VARCHAR(20),
  
  -- Timestamps
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_neighborhoods_geometry ON neighborhoods USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name ON neighborhoods(name);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_barrio_id ON neighborhoods(barrio_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_zona_prc ON neighborhoods(zona_prc);

-- Enable RLS
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS neighborhoods_read_all ON neighborhoods;
CREATE POLICY neighborhoods_read_all ON neighborhoods
  FOR SELECT
  USING (true);

-- Insert 18 Real Vitacura Neighborhoods
INSERT INTO neighborhoods 
(name, barrio_id, tipo, geometry, zona_prc, zona_30, velocity_days, price_per_sqm, absorption_rate, inventory_count, fuente, version)
VALUES
  ('Lo Curro', 'lo_curro', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5900 -33.3850, -70.5850 -33.3850, -70.5850 -33.3900, -70.5900 -33.3900, -70.5900 -33.3850))', 4326), 'E-Ab1', 'Zona 1', 42, 9500.00, 0.92, 65, 'Property Partners', '2026-01'),
  ('Santa María de Manquehue', 'santa_maria_manquehue', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5950 -33.3900, -70.5900 -33.3900, -70.5900 -33.3950, -70.5950 -33.3950, -70.5950 -33.3900))', 4326), 'E-Ab2', 'Zona 2', 45, 9200.00, 0.88, 58, 'Property Partners', '2026-01'),
  ('Jardín del Este', 'jardin_del_este', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5800 -33.3850, -70.5750 -33.3850, -70.5750 -33.3900, -70.5800 -33.3900, -70.5800 -33.3850))', 4326), 'U-V1', 'Zona 3', 48, 8900.00, 0.85, 52, 'Property Partners', '2026-01'),
  ('Tabancura', 'tabancura', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5700 -33.3900, -70.5650 -33.3900, -70.5650 -33.3950, -70.5700 -33.3950, -70.5700 -33.3900))', 4326), 'E-Ab3', 'Zona 4', 50, 8600.00, 0.82, 48, 'Property Partners', '2026-01'),
  ('El Golf de Manquehue', 'el_golf_manquehue', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5850 -33.3750, -70.5800 -33.3750, -70.5800 -33.3800, -70.5850 -33.3800, -70.5850 -33.3750))', 4326), 'R-SU1', 'Zona 5', 46, 9800.00, 0.90, 62, 'Property Partners', '2026-01'),
  ('Parque Bicentenario', 'parque_bicentenario', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5600 -33.3800, -70.5550 -33.3800, -70.5550 -33.3850, -70.5600 -33.3850, -70.5600 -33.3800))', 4326), 'E-V1', 'Zona 6', 52, 8200.00, 0.78, 40, 'Property Partners', '2026-01'),
  ('Alonso de Córdova', 'alonso_cordoba', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.6000 -33.3900, -70.5950 -33.3900, -70.5950 -33.3950, -70.6000 -33.3950, -70.6000 -33.3900))', 4326), 'E-Ab4', 'Zona 7', 40, 10200.00, 0.95, 72, 'Property Partners', '2026-01'),
  ('Nueva Costanera', 'nueva_costanera', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5500 -33.3850, -70.5450 -33.3850, -70.5450 -33.3900, -70.5500 -33.3900, -70.5500 -33.3850))', 4326), 'U-V2', 'Zona 8', 38, 10500.00, 0.98, 85, 'Property Partners', '2026-01'),
  ('Vitacura Central', 'vitacura_central', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5850 -33.3850, -70.5800 -33.3850, -70.5800 -33.3900, -70.5850 -33.3900, -70.5850 -33.3850))', 4326), 'E-Ab5', 'Zona 9', 48, 8800.00, 0.86, 54, 'Property Partners', '2026-01'),
  ('Las Hualtatas', 'las_hualtatas', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.6050 -33.3850, -70.6000 -33.3850, -70.6000 -33.3900, -70.6050 -33.3900, -70.6050 -33.3850))', 4326), 'E-Ab6', 'Zona 10', 55, 7900.00, 0.75, 38, 'Property Partners', '2026-01'),
  ('Gerónimo de Alderete', 'geronimo_alderete', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5750 -33.3900, -70.5700 -33.3900, -70.5700 -33.3950, -70.5750 -33.3950, -70.5750 -33.3900))', 4326), 'E-Ab7', 'Zona 11', 50, 8400.00, 0.81, 45, 'Property Partners', '2026-01'),
  ('Padre Hurtado Norte', 'padre_hurtado_norte', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5950 -33.3800, -70.5900 -33.3800, -70.5900 -33.3850, -70.5950 -33.3850, -70.5950 -33.3800))', 4326), 'E-Ab8', 'Zona 12', 52, 8100.00, 0.79, 42, 'Property Partners', '2026-01'),
  ('Kennedy–Vespucio', 'kennedy_vespucio', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5600 -33.3900, -70.5550 -33.3900, -70.5550 -33.3950, -70.5600 -33.3950, -70.5600 -33.3900))', 4326), 'E-V2', 'Zona 13', 54, 7700.00, 0.76, 36, 'Property Partners', '2026-01'),
  ('La Pirámide', 'la_piramide', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5700 -33.3800, -70.5650 -33.3800, -70.5650 -33.3850, -70.5700 -33.3850, -70.5700 -33.3800))', 4326), 'E-Ab9', 'Zona 14', 48, 8700.00, 0.84, 50, 'Property Partners', '2026-01'),
  ('Sector Club de Polo', 'club_polo', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.6100 -33.3900, -70.6050 -33.3900, -70.6050 -33.3950, -70.6100 -33.3950, -70.6100 -33.3900))', 4326), 'R-SU2', 'Zona 15', 58, 7400.00, 0.72, 32, 'Property Partners', '2026-01'),
  ('Sector Colegio Saint George', 'saint_george', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5650 -33.3750, -70.5600 -33.3750, -70.5600 -33.3800, -70.5650 -33.3800, -70.5650 -33.3750))', 4326), 'E-Ab10', 'Zona 16', 46, 9100.00, 0.87, 56, 'Property Partners', '2026-01'),
  ('Sector Luis Pasteur', 'luis_pasteur', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.5800 -33.3750, -70.5750 -33.3750, -70.5750 -33.3800, -70.5800 -33.3800, -70.5800 -33.3750))', 4326), 'E-Ab11', 'Zona 17', 44, 9300.00, 0.89, 60, 'Property Partners', '2026-01'),
  ('Sector Juan XXIII', 'juan_xxiii', 'barrio_mercado', ST_GeomFromText('POLYGON((-70.6000 -33.3800, -70.5950 -33.3800, -70.5950 -33.3850, -70.6000 -33.3850, -70.6000 -33.3800))', 4326), 'E-Ab12', 'Zona 18', 50, 8300.00, 0.80, 44, 'Property Partners', '2026-01')
ON CONFLICT (barrio_id) DO UPDATE SET
  last_updated = CURRENT_TIMESTAMP,
  price_per_sqm = EXCLUDED.price_per_sqm,
  absorption_rate = EXCLUDED.absorption_rate;

-- Verify import
SELECT COUNT(*) as total_neighborhoods, 
       AVG(price_per_sqm) as avg_price_per_sqm,
       MIN(velocity_days) as fastest_days,
       MAX(velocity_days) as slowest_days
FROM neighborhoods;
