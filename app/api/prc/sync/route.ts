import { NextResponse } from 'next/server'
import { requireExecutiveAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'
import { syncVitacuraPrc } from '@/lib/vitacura-prc-sync'

export async function POST() {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const result = await syncVitacuraPrc(createAdminClient())
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('PRC_SYNC_FAILED', error)
    return NextResponse.json({ ok: false, error: 'No pudimos sincronizar las zonas PRC.' }, { status: 500 })
  }
}

export async function GET() {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const source = await fetchVitacuraPrcRows()
    return NextResponse.json({
      available: source.rows.length,
      source: 'Municipalidad de Vitacura · visor PRC vigente',
      officialViewer: source.officialViewer,
      sourceVersion: source.sourceVersion,
      sourceObservedAt: source.sourceObservedAt,
      diagnostics: source.diagnostics,
    })
  } catch (error) {
    console.error('PRC_PREVIEW_FAILED', error)
    return NextResponse.json({ error: 'No pudimos consultar la fuente PRC.' }, { status: 500 })
  }
}
