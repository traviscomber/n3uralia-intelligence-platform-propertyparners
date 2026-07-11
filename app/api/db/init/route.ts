import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to insert a test neighborhood to verify table exists
    const { data: testData, error: testError } = await supabase
      .from('neighborhoods')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      return NextResponse.json({
        status: 'table_missing',
        message: 'neighborhoods table not found',
        action: 'Execute migration in Supabase Dashboard',
        file: 'supabase/migrations/20260711_fix_neighborhoods.sql',
        instructions: [
          '1. Open https://app.supabase.com',
          '2. Go to SQL Editor → New Query',
          '3. Copy content from supabase/migrations/20260711_fix_neighborhoods.sql',
          '4. Paste and click RUN',
          '5. Then call this endpoint again'
        ]
      });
    }

    // Get all tables and their columns
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .in('table_name', ['neighborhoods', 'properties']);

    if (schemaError) {
      return NextResponse.json({
        status: 'error',
        message: schemaError.message
      });
    }

    // Group by table
    const tableSchema: any = {};
    schema?.forEach((col: any) => {
      if (!tableSchema[col.table_name]) {
        tableSchema[col.table_name] = [];
      }
      tableSchema[col.table_name].push({
        name: col.column_name,
        type: col.data_type
      });
    });

    // Get row counts
    const { count: neighborhoodsCount } = await supabase
      .from('neighborhoods')
      .select('*', { count: 'exact', head: true });

    const { count: propertiesCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      status: 'success',
      tables: {
        neighborhoods: {
          exists: true,
          fields: tableSchema.neighborhoods || [],
          row_count: neighborhoodsCount || 0
        },
        properties: {
          exists: true,
          fields: tableSchema.properties || [],
          row_count: propertiesCount || 0
        }
      },
      ready_for: [
        'Market Intelligence Dashboard',
        'Property Loader',
        'Valorizador',
        'Weekly Reports'
      ]
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}
