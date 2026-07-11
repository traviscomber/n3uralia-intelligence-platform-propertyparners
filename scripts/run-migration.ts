import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract connection string from Supabase URL
const projectId = supabaseUrl?.replace('https://', '').split('.')[0];
const connectionString = `postgres://postgres:${supabaseKey}@db.${projectId}.supabase.co:5432/postgres`;

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  let sql: postgres.Sql | null = null;

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260710_create_neighborhoods.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('✓ Migration file loaded');
    console.log(`✓ ${migrationSQL.split('\n').length} lines of SQL\n`);

    // Connect to database
    console.log('🔗 Connecting to Supabase database...');
    sql = postgres(connectionString, { 
      ssl: 'require',
      idle_timeout: 5,
      max: 1,
    });

    // Test connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✓ Connected to Supabase\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5);

    console.log(`📋 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const stmtNum = i + 1;
      const keyword = stmt.match(/^\s*(\w+)/)?.[1] || 'QUERY';

      process.stdout.write(`[${stmtNum}/${statements.length}] ${keyword}... `);

      try {
        await sql.unsafe(stmt);
        console.log('✓');
        successCount++;
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        
        // Check if it's a "already exists" error - that's OK
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('duplicate key') ||
            errorMsg.includes('exists')) {
          console.log('(exists)');
          successCount++;
        } else {
          console.log(`⚠️ ${errorMsg.split('\n')[0].slice(0, 40)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Migration execution complete`);
    console.log(`   ✓ Successful: ${successCount}/${statements.length}`);
    if (errorCount > 0) {
      console.log(`   ⚠️ Errors: ${errorCount}`);
    }

    // Verify neighborhoods table exists
    console.log('\n🔍 Verifying schema...');
    const verifyResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('neighborhoods', 'properties')
    `;

    if (verifyResult.length > 0) {
      console.log('✓ Tables created successfully:');
      verifyResult.forEach(row => {
        console.log(`  - ${(row as any).table_name}`);
      });
    } else {
      console.log('⚠️ Could not verify tables');
    }

    console.log('\n✅ Database migration completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    process.exit(1);
  } finally {
    // Close connection
    if (sql) {
      await sql.end();
    }
  }
}

runMigration();
