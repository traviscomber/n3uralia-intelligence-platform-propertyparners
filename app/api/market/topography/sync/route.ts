import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await requireAnyCapability(['valuations.global.approve'])
    const admin = createAdminClient()
    let processed = 0
    let failed = 0
    let last: Record<string, unknown> | null = null

    for (let i = 0; i < 8; i += 1) {
      const { data, error } = await admin.rpc('valuation_topography_backfill_lo_curro_glo90_v1', { p_limit: 25 })
      if (error) {
        console.error('VALUATION_TOPOGRAPHY_SYNC_FAILED', { code: error.code ?? 'UNKNOWN' })
        return NextResponse.json({ error: 'No fue posible sincronizar topografía.' }, { status: 500 })
      }
      last = data && typeof data === 'object' ? data as Record<string, unknown> : null
      const batchProcessed = Number(last?.processed ?? 0)
      processed += batchProcessed
      failed += Number(last?.failed ?? 0)
      if (batchProcessed === 0) break
    }

    return NextResponse.json({
      ok: failed === 0,
      processed,
      failed,
      source: 'Copernicus DEM 2021 GLO-90 via Open-Meteo Elevation API',
      mode: 'structural_evidence_only',
      changesChampionWeights: false,
      last,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
