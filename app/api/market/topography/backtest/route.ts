import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAnyCapability(['valuations.office.read', 'valuations.global.read'])
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_topography_backtest_lo_curro_v1')
    if (error) {
      console.error('VALUATION_TOPOGRAPHY_BACKTEST_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible ejecutar backtest topográfico.' }, { status: 500 })
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
