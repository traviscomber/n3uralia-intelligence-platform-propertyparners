import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/prc/zones — return PRC zones with geometry as GeoJSON via PostGIS RPC
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_prc_zones_geojson')

    if (error) {
      console.error('PRC_ZONES_LOAD_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No pudimos cargar las zonas PRC.' }, { status: 500 })
    }

    return NextResponse.json({ zones: data ?? [] })
  } catch {
    console.error('PRC_ZONES_UNEXPECTED_FAILURE')
    return NextResponse.json({ error: 'No pudimos cargar las zonas PRC.' }, { status: 500 })
  }
}
