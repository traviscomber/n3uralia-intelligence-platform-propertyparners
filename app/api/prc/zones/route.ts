import { NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

// GET /api/prc/zones — return PRC zones with geometry as GeoJSON via PostGIS RPC
export async function GET() {
  try {
    await requireCapability('market.read')
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_prc_zones_geojson')

    if (error) {
      console.error('PRC_ZONES_LOAD_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No pudimos cargar las zonas PRC.' }, { status: 500 })
    }

    return NextResponse.json({ zones: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}