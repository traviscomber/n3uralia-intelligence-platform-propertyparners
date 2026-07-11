import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/prc/zones — return PRC zones with geometry as GeoJSON via PostGIS RPC
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_prc_zones_geojson')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ zones: data ?? [] })
}
