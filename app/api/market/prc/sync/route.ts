import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'
import { fetchVitacuraPrcArcgisRows } from '@/lib/vitacura-prc-arcgis'

export async function POST(request: Request) {
  try {
    await requireAnyCapability(['valuations.global.approve'])
    const admin = createAdminClient()
    const url = new URL(request.url)
    const requestedSource = url.searchParams.get('source')

    let source: {
      rows: unknown[]
      sourceVersion: string
      sourceUrl?: string
      officialViewer?: string
      diagnostics: unknown
    }

    if (requestedSource === 'arcgis') {
      source = await fetchVitacuraPrcArcgisRows()
    } else {
      try {
        source = await fetchVitacuraPrcRows()
      } catch (primaryError) {
        console.warn('VITACURA_PRC_CURRENT_SOURCE_UNAVAILABLE', {
          message: primaryError instanceof Error ? primaryError.message : 'UNKNOWN',
        })
        source = await fetchVitacuraPrcArcgisRows()
      }
    }

    const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })
    if (error) {
      console.error('VITACURA_PRC_SYNC_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible persistir la capa PRC.' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      sourceVersion: source.sourceVersion,
      sourceUrl: source.sourceUrl ?? source.officialViewer ?? null,
      diagnostics: source.diagnostics,
      database: data,
      usePolicy: source.sourceVersion.includes('2016')
        ? 'historical_backtest_context_only_until_reconciled_with_current_municipal_prc'
        : 'current_municipal_reference_context',
    })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VITACURA_PRC_SYNC_UNEXPECTED', error)
    return NextResponse.json({ error: 'No fue posible sincronizar el PRC de Vitacura.' }, { status: 500 })
  }
}
