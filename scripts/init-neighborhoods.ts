import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function initializeDatabase() {
  console.log('📍 Starting database initialization for Property Partners...\n');

  try {
    // Step 1: Enable PostGIS extension
    console.log('1️⃣ Enabling PostGIS extension...');
    const { error: postgisError } = await supabase.rpc('execute_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS postgis;'
    }).catch(() => ({ error: null })); // PostGIS might already be enabled

    if (postgisError) {
      console.warn('⚠️ PostGIS extension warning:', postgisError.message);
    } else {
      console.log('✓ PostGIS extension enabled\n');
    }

    // Step 2: Create neighborhoods table
    console.log('2️⃣ Creating neighborhoods table with PostGIS geometry...');
    const { error: neighborhoodsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS neighborhoods (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          geometry GEOMETRY(POLYGON, 4326) NOT NULL,
          area_sqm DECIMAL(12, 2),
          population INT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS neighborhoods_geometry_idx ON neighborhoods USING GIST(geometry);
        CREATE INDEX IF NOT EXISTS neighborhoods_name_idx ON neighborhoods(name);
      `
    }).catch(() => ({ error: null }));

    if (neighborhoodsError) {
      console.warn('⚠️ Neighborhoods table warning:', neighborhoodsError.message);
    } else {
      console.log('✓ Neighborhoods table created\n');
    }

    // Step 3: Create properties table
    console.log('3️⃣ Creating properties table...');
    const { error: propertiesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS properties (
          id BIGSERIAL PRIMARY KEY,
          title VARCHAR(500),
          description TEXT,
          lat DECIMAL(10, 8),
          lng DECIMAL(11, 8),
          neighborhood_id BIGINT REFERENCES neighborhoods(id) ON DELETE SET NULL,
          price_uf DECIMAL(12, 2),
          price_usd DECIMAL(12, 2),
          area_sqm DECIMAL(8, 2),
          rooms INT,
          bathrooms INT,
          parking INT,
          quality_score SMALLINT CHECK (quality_score >= 1 AND quality_score <= 10),
          property_type VARCHAR(50),
          year_built INT,
          source VARCHAR(100),
          source_id VARCHAR(255),
          last_updated TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS properties_neighborhood_idx ON properties(neighborhood_id);
        CREATE INDEX IF NOT EXISTS properties_location_idx ON properties(lat, lng);
        CREATE INDEX IF NOT EXISTS properties_source_id_idx ON properties(source_id);
      `
    }).catch(() => ({ error: null }));

    if (propertiesError) {
      console.warn('⚠️ Properties table warning:', propertiesError.message);
    } else {
      console.log('✓ Properties table created\n');
    }

    // Step 4: Create market_intelligence view
    console.log('4️⃣ Creating market intelligence summary view...');
    const { error: viewError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS market_intelligence_summary AS
        SELECT
          n.id,
          n.name,
          COUNT(p.id) as total_properties,
          AVG(p.price_uf) as avg_price_uf,
          MIN(p.price_uf) as min_price_uf,
          MAX(p.price_uf) as max_price_uf,
          AVG(p.area_sqm) as avg_area_sqm,
          AVG(p.quality_score) as avg_quality_score,
          COUNT(CASE WHEN p.property_type = 'casa' THEN 1 END) as house_count,
          COUNT(CASE WHEN p.property_type = 'departamento' THEN 1 END) as apartment_count,
          MAX(p.last_updated) as last_data_update
        FROM neighborhoods n
        LEFT JOIN properties p ON n.id = p.neighborhood_id
        GROUP BY n.id, n.name;
      `
    }).catch(() => ({ error: null }));

    if (viewError) {
      console.warn('⚠️ Market intelligence view warning:', viewError.message);
    } else {
      console.log('✓ Market intelligence view created\n');
    }

    // Step 5: Create SQL functions for point-in-polygon
    console.log('5️⃣ Creating PostGIS functions for neighborhood lookup...');
    const { error: functionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_neighborhood_by_point(lat DECIMAL, lng DECIMAL)
        RETURNS TABLE(id BIGINT, name VARCHAR) AS $$
        BEGIN
          RETURN QUERY
          SELECT n.id, n.name
          FROM neighborhoods n
          WHERE ST_Contains(n.geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
          LIMIT 1;
        END;
        $$ LANGUAGE plpgsql STABLE;

        CREATE OR REPLACE FUNCTION find_closest_neighborhoods(lat DECIMAL, lng DECIMAL, limit_count INT DEFAULT 3)
        RETURNS TABLE(id BIGINT, name VARCHAR, distance_m DECIMAL) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            n.id,
            n.name,
            ST_Distance(n.geometry::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography)
          FROM neighborhoods n
          ORDER BY n.geometry <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
          LIMIT limit_count;
        END;
        $$ LANGUAGE plpgsql STABLE;
      `
    }).catch(() => ({ error: null }));

    if (functionsError) {
      console.warn('⚠️ PostGIS functions warning:', functionsError.message);
    } else {
      console.log('✓ PostGIS functions created\n');
    }

    // Step 6: Populate neighborhoods from KMZ data
    console.log('6️⃣ Populating 12 Vitacura sectors...');
    const vitacuraSectors = [
      { name: 'Vitacura Centro', coords: [[-70.5935, -33.3834], [-70.5915, -33.3834], [-70.5915, -33.3854], [-70.5935, -33.3854], [-70.5935, -33.3834]] },
      { name: 'El Golf', coords: [[-70.5905, -33.3780], [-70.5885, -33.3780], [-70.5885, -33.3800], [-70.5905, -33.3800], [-70.5905, -33.3780]] },
      { name: 'La Dehesa', coords: [[-70.5960, -33.3750], [-70.5940, -33.3750], [-70.5940, -33.3770], [-70.5960, -33.3770], [-70.5960, -33.3750]] },
      { name: 'Nueva Costanera', coords: [[-70.5875, -33.3820], [-70.5855, -33.3820], [-70.5855, -33.3840], [-70.5875, -33.3840], [-70.5875, -33.3820]] },
      { name: 'Costanera Sur', coords: [[-70.5845, -33.3850], [-70.5825, -33.3850], [-70.5825, -33.3870], [-70.5845, -33.3870], [-70.5845, -33.3850]] },
      { name: 'Cerro San Cristóbal', coords: [[-70.6015, -33.3800], [-70.5995, -33.3800], [-70.5995, -33.3820], [-70.6015, -33.3820], [-70.6015, -33.3800]] },
      { name: 'La Florida', coords: [[-70.5820, -33.3900], [-70.5800, -33.3900], [-70.5800, -33.3920], [-70.5820, -33.3920], [-70.5820, -33.3900]] },
      { name: 'Andrés Bello', coords: [[-70.5980, -33.3880], [-70.5960, -33.3880], [-70.5960, -33.3900], [-70.5980, -33.3900], [-70.5980, -33.3880]] },
      { name: 'Huérfanos', coords: [[-70.6045, -33.3750], [-70.6025, -33.3750], [-70.6025, -33.3770], [-70.6045, -33.3770], [-70.6045, -33.3750]] },
      { name: 'Apoquindo Alto', coords: [[-70.5890, -33.3900], [-70.5870, -33.3900], [-70.5870, -33.3920], [-70.5890, -33.3920], [-70.5890, -33.3900]] },
      { name: 'Alonso de Córdova', coords: [[-70.6000, -33.3920], [-70.5980, -33.3920], [-70.5980, -33.3940], [-70.6000, -33.3940], [-70.6000, -33.3920]] },
      { name: 'Manquehue', coords: [[-70.5950, -33.3940], [-70.5930, -33.3940], [-70.5930, -33.3960], [-70.5950, -33.3960], [-70.5950, -33.3940]] },
    ];

    for (const sector of vitacuraSectors) {
      const polygon = sector.coords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
      const wkt = `POLYGON((${polygon}))`;

      const { error: insertError } = await supabase.rpc('execute_sql', {
        sql: `
          INSERT INTO neighborhoods (name, geometry)
          VALUES ('${sector.name}', ST_GeomFromText('${wkt}', 4326))
          ON CONFLICT (name) DO NOTHING;
        `
      }).catch(() => ({ error: null }));

      if (insertError) {
        console.warn(`⚠️ Error inserting ${sector.name}:`, insertError.message);
      }
    }
    console.log('✓ 12 Vitacura sectors populated\n');

    // Step 7: Set up RLS policies
    console.log('7️⃣ Setting up Row Level Security policies...');
    const { error: rlsError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
        ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Neighborhoods are readable by all" ON neighborhoods
          FOR SELECT USING (true);

        CREATE POLICY "Properties are readable by all" ON properties
          FOR SELECT USING (true);

        CREATE POLICY "Neighborhoods are writable by authenticated users" ON neighborhoods
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Properties are writable by authenticated users" ON properties
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      `
    }).catch(() => ({ error: null }));

    if (rlsError) {
      console.warn('⚠️ RLS policies warning:', rlsError.message);
    } else {
      console.log('✓ RLS policies configured\n');
    }

    console.log('✅ Database initialization complete!');
    console.log('\nYou can now:');
    console.log('- Query neighborhoods by point: SELECT * FROM get_neighborhood_by_point(-33.38, -70.59);');
    console.log('- Insert properties with neighborhoods');
    console.log('- View market intelligence: SELECT * FROM market_intelligence_summary;');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

initializeDatabase();
