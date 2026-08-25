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
    const { data, error } = await admin.rpc('lookup_vitacura_prc_v1', { p_lat: lat, p_lon: lon })
    if (error) {
      console.error('VITACURA_PRC_LOOKUP_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible consultar PRC.' }, { status: 500 })
    }
    return NextResponse.json({ zones: Array.isArray(data) ? data : [], available: Array.isArray(data) && data.length > 0 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
