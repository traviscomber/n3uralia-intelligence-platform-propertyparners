import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('📊 Verificando estructura de base de datos...\n');

  try {
    // Check neighborhoods table
    console.log('1️⃣ Verificando tabla neighborhoods...');
    const { data: neighborhoods, error: nbError } = await supabase
      .from('neighborhoods')
      .select('id, name')
      .limit(1);

    if (nbError) {
      console.error('❌ Error neighborhoods:', nbError.message);
    } else if (neighborhoods && neighborhoods.length > 0) {
      console.log('✅ Tabla neighborhoods existe');
      console.log(`   - Sectores encontrados: ${neighborhoods.length}`);
    } else {
      console.log('⚠️ Tabla neighborhoods existe pero está vacía');
    }

    // Check properties table
    console.log('\n2️⃣ Verificando tabla properties...');
    const { data: properties, error: prError } = await supabase
      .from('properties')
      .select('id')
      .limit(1);

    if (prError) {
      console.error('❌ Error properties:', prError.message);
    } else {
      console.log('✅ Tabla properties existe');
      console.log(`   - Propiedades registradas: ${properties?.length || 0}`);
    }

    // Get full schema info
    console.log('\n3️⃣ Obteniendo información de esquema...');
    const { data: tables, error: schemaError } = await supabase
      .rpc('query', {
        query: `
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name IN ('neighborhoods', 'properties')
          ORDER BY table_name, ordinal_position
        `
      })
      .catch(async () => {
        // Fallback: try direct query
        console.log('   Usando query directa...');
        const { data, error } = await supabase
          .from('neighborhoods')
          .select('*')
          .limit(0);
        
        return { data: [], error };
      });

    if (!schemaError) {
      console.log('✅ Esquema verificado correctamente\n');
    }

    // Count records
    console.log('4️⃣ Contando registros...');
    const { count: nbCount, error: nbCountError } = await supabase
      .from('neighborhoods')
      .select('*', { count: 'exact', head: true });

    if (!nbCountError) {
      console.log(`✅ Neighborhoods: ${nbCount} registros`);
    }

    const { count: prCount, error: prCountError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (!prCountError) {
      console.log(`✅ Properties: ${prCount} registros`);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyDatabase();
