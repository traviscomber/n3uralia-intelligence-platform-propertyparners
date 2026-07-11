-- ============================================================
-- Property Partners - Complete Database Setup
-- Execute in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. ADD MISSING COLUMNS to neighborhoods table
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS barrio_id VARCHAR(100);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS zona_prc VARCHAR(50);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS velocity_days INTEGER DEFAULT 52;
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS price_per_sqm NUMERIC(10,2);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS price_trend_3yr NUMERIC(5,2);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS price_trend_5yr NUMERIC(5,2);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS absorption_rate NUMERIC(5,2);
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0;
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. ADD MISSING COLUMNS to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS portal_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS neighborhood_id BIGINT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS barrio_id VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_uf NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_clp BIGINT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqm NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rooms INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'apartment';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMP DEFAULT NOW();
ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 3. POPULATE vitacura_market_neighborhoods with all 12 sectors + market data
INSERT INTO vitacura_market_neighborhoods (
  barrio_id, barrio_nombre, zona_prc, geometry,
  velocity_days, price_per_sqm_uf, price_trend_3yr_pct, price_trend_5yr_pct,
  absorption_rate, inventory_count, last_updated
)
VALUES
  ('vitacura_centro', 'Vitacura Centro', 'ZC-1',
   ST_GeomFromText('POLYGON((-70.5935 -33.3834,-70.5915 -33.3834,-70.5915 -33.3854,-70.5935 -33.3854,-70.5935 -33.3834))',4326),
   48, 85.0, 12.5, 22.3, 0.85, 45, NOW()),
  ('el_golf', 'El Golf', 'ZR-1',
   ST_GeomFromText('POLYGON((-70.5905 -33.3780,-70.5885 -33.3780,-70.5885 -33.3800,-70.5905 -33.3800,-70.5905 -33.3780))',4326),
   45, 92.0, 14.2, 26.1, 0.88, 52, NOW()),
  ('la_dehesa', 'La Dehesa', 'ZR-2',
   ST_GeomFromText('POLYGON((-70.5960 -33.3750,-70.5940 -33.3750,-70.5940 -33.3770,-70.5960 -33.3770,-70.5960 -33.3750))',4326),
   55, 78.0, 9.8, 18.5, 0.78, 38, NOW()),
  ('nueva_costanera', 'Nueva Costanera', 'ZC-2',
   ST_GeomFromText('POLYGON((-70.5875 -33.3820,-70.5855 -33.3820,-70.5855 -33.3840,-70.5875 -33.3840,-70.5875 -33.3820))',4326),
   40, 95.0, 15.8, 28.4, 0.90, 58, NOW()),
  ('costanera_sur', 'Costanera Sur', 'ZC-3',
   ST_GeomFromText('POLYGON((-70.5845 -33.3850,-70.5825 -33.3850,-70.5825 -33.3870,-70.5845 -33.3870,-70.5845 -33.3850))',4326),
   50, 88.0, 11.2, 20.7, 0.82, 42, NOW()),
  ('cerro_san_cristobal', 'Cerro San Cristóbal', 'ZV-1',
   ST_GeomFromText('POLYGON((-70.6015 -33.3800,-70.5995 -33.3800,-70.5995 -33.3820,-70.6015 -33.3820,-70.6015 -33.3800))',4326),
   60, 72.0, 7.5, 15.2, 0.72, 28, NOW()),
  ('andres_bello', 'Andrés Bello', 'ZR-3',
   ST_GeomFromText('POLYGON((-70.5980 -33.3880,-70.5960 -33.3880,-70.5960 -33.3900,-70.5980 -33.3900,-70.5980 -33.3880))',4326),
   46, 89.0, 13.1, 24.8, 0.86, 48, NOW()),
  ('huerfanos', 'Huérfanos', 'ZR-4',
   ST_GeomFromText('POLYGON((-70.6045 -33.3750,-70.6025 -33.3750,-70.6025 -33.3770,-70.6045 -33.3770,-70.6045 -33.3750))',4326),
   58, 75.0, 8.9, 16.4, 0.75, 35, NOW()),
  ('apoquindo_alto', 'Apoquindo Alto', 'ZR-5',
   ST_GeomFromText('POLYGON((-70.5890 -33.3900,-70.5870 -33.3900,-70.5870 -33.3920,-70.5890 -33.3920,-70.5890 -33.3900))',4326),
   44, 91.0, 13.7, 25.5, 0.87, 50, NOW()),
  ('alonso_de_cordova', 'Alonso de Córdova', 'ZC-4',
   ST_GeomFromText('POLYGON((-70.6000 -33.3920,-70.5980 -33.3920,-70.5980 -33.3940,-70.6000 -33.3940,-70.6000 -33.3920))',4326),
   52, 83.0, 10.5, 19.8, 0.80, 40, NOW()),
  ('manquehue', 'Manquehue', 'ZR-6',
   ST_GeomFromText('POLYGON((-70.5950 -33.3940,-70.5930 -33.3940,-70.5930 -33.3960,-70.5950 -33.3960,-70.5950 -33.3940))',4326),
   54, 80.0, 10.0, 19.0, 0.79, 39, NOW()),
  ('la_florida_vitacura', 'La Florida', 'ZR-7',
   ST_GeomFromText('POLYGON((-70.5820 -33.3900,-70.5800 -33.3900,-70.5800 -33.3920,-70.5820 -33.3920,-70.5820 -33.3900))',4326),
   62, 68.0, 6.5, 13.0, 0.68, 25, NOW())
ON CONFLICT (barrio_id) DO UPDATE SET
  velocity_days = EXCLUDED.velocity_days,
  price_per_sqm_uf = EXCLUDED.price_per_sqm_uf,
  last_updated = NOW();

-- 4. CREATE point-in-polygon RPC function
CREATE OR REPLACE FUNCTION tag_vitacura_point(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS TABLE(barrio_id TEXT, barrio_nombre TEXT, zona_prc TEXT, velocity_days INTEGER, price_per_sqm_uf NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT
    barrio_id::TEXT,
    barrio_nombre,
    zona_prc,
    velocity_days,
    price_per_sqm_uf
  FROM vitacura_market_neighborhoods
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
$$;

-- 5. VERIFY
SELECT COUNT(*) as neighborhoods_count FROM neighborhoods;
SELECT COUNT(*) as market_count FROM vitacura_market_neighborhoods;
SELECT barrio_id, barrio_nombre, velocity_days, price_per_sqm_uf FROM vitacura_market_neighborhoods LIMIT 5;
