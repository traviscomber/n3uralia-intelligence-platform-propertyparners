import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'

export async function POST() {
  try {
    await requireAnyCapability(['valuations.global.approve'])
    const admin = createAdminClient()
    const source = await fetchVitacuraPrcRows()
    const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })

    if (error) {
      console.error('VITACURA_PRC_SYNC_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible persistir la capa PRC.' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      source: 'Municipalidad de Vitacura · visor PRC vigente',
      officialViewer: source.officialViewer,
      sourceVersion: source.sourceVersion,
      diagnostics: source.diagnostics,
      database: data,
    })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VITACURA_PRC_SYNC_UNEXPECTED', error)
    return NextResponse.json({ error: 'No fue posible sincronizar el PRC de Vitacura.' }, { status: 500 })
  }
}
