import { createClient } from '@supabase/supabase-js'
import { fetchVitacuraPrcRows } from '../lib/vitacura-prc'

const allowedBranch = 'feat/valuation-prc-quality-executive-report'

async function main() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== allowedBranch) {
    console.log('[vitacura-prc] skipped outside authorized preview branch')
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('[vitacura-prc] secure Supabase configuration missing')

  const source = await fetchVitacuraPrcRows()
  if (source.rows.length < 5) throw new Error(`[vitacura-prc] unsafe row count: ${source.rows.length}`)
  if (source.rows.some((row) => !row.zona || !row.geometry.coordinates.length)) throw new Error('[vitacura-prc] malformed zone row')

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.rpc('sync_vitacura_prc_zones_v1', { p_rows: source.rows })
  if (error) throw new Error(`[vitacura-prc] sync failed: ${error.code ?? error.message}`)

  console.log('[vitacura-prc] synced', JSON.stringify({ rows: source.rows.length, diagnostics: source.diagnostics, database: data }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
