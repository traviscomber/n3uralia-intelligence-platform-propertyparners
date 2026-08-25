import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'

const ALLOWED_BRANCH = 'feat/valuation-prc-quality-executive-report'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== ALLOWED_BRANCH) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const source = await fetchVitacuraPrcRows()
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })
    if (error) {
      console.error('VITACURA_PRC_BOOTSTRAP_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'PRC bootstrap failed' }, { status: 500 })
    }
    return NextResponse.json({ status: 'ok', diagnostics: source.diagnostics, database: data, sourceVersion: source.sourceVersion })
  } catch (error) {
    console.error('VITACURA_PRC_BOOTSTRAP_UNEXPECTED', error)
    return NextResponse.json({ error: 'PRC source fetch failed' }, { status: 502 })
  }
}
