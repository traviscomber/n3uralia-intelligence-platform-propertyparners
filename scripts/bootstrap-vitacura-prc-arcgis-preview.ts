import { createClient } from '@supabase/supabase-js'
import { fetchVitacuraPrcArcgisRows } from '../lib/vitacura-prc-arcgis'

const allowedBranch = 'feat/valuation-prc-arcgis-champion-v6'

async function main() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== allowedBranch) {
    console.log('[vitacura-prc-arcgis] skipped outside authorized preview branch')
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('[vitacura-prc-arcgis] secure Supabase configuration missing')

  const source = await fetchVitacuraPrcArcgisRows()
  if (source.rows.length < 10) throw new Error(`[vitacura-prc-arcgis] unsafe row count: ${source.rows.length}`)
  if (source.rows.some((row) => !row.zona || !row.geometry.coordinates.length)) throw new Error('[vitacura-prc-arcgis] malformed polygon row')

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })
  if (error) throw new Error(`[vitacura-prc-arcgis] sync failed: ${error.code ?? error.message}`)
  console.log('[vitacura-prc-arcgis] synced', JSON.stringify({ rows: source.rows.length, diagnostics: source.diagnostics, database: data }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
