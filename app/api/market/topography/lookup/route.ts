import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireAnyCapability(['valuations.self.read', 'valuations.office.read', 'valuations.global.read'])
    const url = new URL(request.url)
    const lat = Number(url.searchParams.get('lat'))
    const lon = Number(url.searchParams.get('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_topography_lookup_v1', {
      p_lat: lat,
      p_lon: lon,
      p_max_distance_m: 120,
    })
    if (error) {
      console.error('VALUATION_TOPOGRAPHY_LOOKUP_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible consultar topografía.' }, { status: 500 })
    }

    return NextResponse.json(data ?? {
      available: false,
      reason: 'no_versioned_topography_sample',
      nonBinding: true,
      valuationAdjustmentPct: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
