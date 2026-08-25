import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAnyCapability(['valuations.office.read', 'valuations.global.read'])
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_topography_coverage_v1')
    if (error) {
      console.error('VALUATION_TOPOGRAPHY_COVERAGE_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible medir cobertura topográfica.' }, { status: 500 })
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
