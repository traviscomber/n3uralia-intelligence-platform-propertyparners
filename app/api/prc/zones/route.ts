import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/prc/zones — return prc zones with geometry as GeoJSON
export async function GET() {
  const { data, error } = await supabase
    .from('vitacura_prc_zones')
    .select('id, zona, subzona, uso_suelo, geometry')
    .not('geometry', 'is', null)
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Convert geometry from WKB to GeoJSON via PostGIS
  const { data: geoData, error: geoErr } = await supabase.rpc('get_prc_zones_geojson')
  if (!geoErr && geoData) return NextResponse.json({ zones: geoData })

  // Fallback: return raw data without geometry
  return NextResponse.json({ zones: data || [] })
}
