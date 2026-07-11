import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📋 Applying database migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260711_fix_neighborhoods.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('✓ Migration file loaded');
    console.log(`✓ ${migrationSQL.length} bytes\n`);

    // Parse and execute key statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);

    console.log(`📍 Found ${statements.length} SQL statements`);
    console.log('\n⚠️ NOTE: This script is informational only.');
    console.log('You must execute the migration in Supabase Dashboard:\n');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Click "SQL Editor" → "New Query"');
    console.log('3. Copy-paste the migration file: supabase/migrations/20260711_fix_neighborhoods.sql');
    console.log('4. Click "Run"\n');

    // Try to populate neighborhoods directly via Supabase
    console.log('📍 Attempting to insert neighborhoods data...\n');

    const neighborhoods = [
      {
        name: 'Vitacura Centro',
        sector_name: 'Centro',
        geometry: 'POLYGON((-70.5935 -33.3834, -70.5915 -33.3834, -70.5915 -33.3854, -70.5935 -33.3854, -70.5935 -33.3834))',
        velocity_days: 48,
        price_per_sqm: 8500.00,
        absorption_rate: 0.85,
        inventory_count: 45
      },
      {
        name: 'El Golf',
        sector_name: 'Golf',
        geometry: 'POLYGON((-70.5905 -33.3780, -70.5885 -33.3780, -70.5885 -33.3800, -70.5905 -33.3800, -70.5905 -33.3780))',
        velocity_days: 45,
        price_per_sqm: 9200.00,
        absorption_rate: 0.88,
        inventory_count: 52
      }
    ];

    console.log(`✓ Neighborhoods data prepared (${neighborhoods.length} sectors ready)`);
    console.log('✓ After migration, run: pnpm tsx scripts/apply-migration.ts --populate\n');

    if (process.argv.includes('--populate')) {
      console.log('🔄 Populating neighborhoods...');
      
      for (const nb of neighborhoods) {
        try {
          const { error } = await supabase
            .from('neighborhoods')
            .insert([{
              name: nb.name,
              sector_name: nb.sector_name,
              geometry: nb.geometry,
              velocity_days: nb.velocity_days,
              price_per_sqm: nb.price_per_sqm,
              absorption_rate: nb.absorption_rate,
              inventory_count: nb.inventory_count
            }]);
          
          if (!error) {
            console.log(`✓ ${nb.name}`);
          }
        } catch (e) {
          console.log(`⚠️ ${nb.name} - table may not exist yet`);
        }
      }
    }

    console.log('\n✅ Migration file is ready');
    console.log('Next: Execute in Supabase Dashboard, then verify with /api/db/migrate');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyMigration();
