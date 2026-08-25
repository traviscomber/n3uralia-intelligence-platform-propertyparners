import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchVitacuraPrcArcgisRows } from '@/lib/vitacura-prc-arcgis'

const ALLOWED_BRANCH = 'feat/valuation-prc-arcgis-champion-v6'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== ALLOWED_BRANCH) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const source = await fetchVitacuraPrcArcgisRows()
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })
    if (error) return NextResponse.json({ error: 'database_sync_failed', code: error.code }, { status: 500 })
    return NextResponse.json({ status: 'ok', sourceVersion: source.sourceVersion, diagnostics: source.diagnostics, database: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'arcgis_probe_failed' }, { status: 502 })
  }
}
