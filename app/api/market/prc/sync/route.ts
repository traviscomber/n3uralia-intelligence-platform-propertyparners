import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadVitacuraPrcSnapshot } from '@/lib/vitacura-prc-snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await requireAnyCapability(['valuations.global.approve'])
    const admin = createAdminClient()
    const snapshot = await loadVitacuraPrcSnapshot()
    const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: snapshot.rows })

    if (error) {
      console.error('VITACURA_PRC_SYNC_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible persistir la capa PRC.' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      source: snapshot.source.provider,
      sourceUrl: snapshot.source.service,
      sourceVersion: snapshot.source.sourceVersion,
      sourceObservedAt: snapshot.source.observedAt,
      checksumSha256: snapshot.checksumSha256,
      rows: snapshot.rows.length,
      usePolicy: snapshot.source.effectiveContext,
      changesChampionWeights: false,
      database: data,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VITACURA_PRC_SYNC_UNEXPECTED', error)
    return NextResponse.json({
      error: 'No existe un snapshot PRC versionado y validado disponible para sincronizar.',
      changesChampionWeights: false,
    }, { status: 503 })
  }
}
