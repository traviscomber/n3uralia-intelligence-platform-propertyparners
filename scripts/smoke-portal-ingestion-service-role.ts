import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '../lib/market-source-import'

const DATASETS: PortalDatasetKind[] = ['portal_apartments', 'portal_houses', 'portal_projects']

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  assert.ok(url && key, 'Missing Supabase service-role credentials')
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  for (const datasetKind of DATASETS) {
    const collection = await collectPortalVitacura({
      datasetKind,
      commune: 'vitacura-metropolitana',
      operation: 'venta',
      maxPages: 1,
      maxListings: 1,
      waitMs: 250,
    })
    const normalized = normalizePortalListingRows(collection.rows)
    const row = normalized.find((candidate) => candidate.source_listing_id && candidate.url)
    assert.ok(row, `${datasetKind}: no valid row for ingestion smoke`)

    const { data, error } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
      p_source_label: 'portal_inmobiliario_vitacura',
      p_source_file: `qalito-service-role-smoke-${datasetKind}-${row.source_listing_id}.json`,
      p_dataset_kind: datasetKind,
      p_observed_at: collection.observedAt,
      p_rows: [row],
      p_full_snapshot: false,
    })

    assert.equal(error, null, `${datasetKind}: RPC error ${error?.message ?? ''}`)
    const result = data as Record<string, unknown>
    assert.notEqual(result.failed, true, `${datasetKind}: ingestion returned failed`)
    assert.ok(Number(result.accepted ?? 0) >= 1, `${datasetKind}: expected at least one accepted row`)
    console.log(`[portal-ingestion-smoke:${datasetKind}] PASS`, JSON.stringify(result))
  }

  console.log('[portal-ingestion-smoke] PASS all datasets through service-role path')
}

main().catch((error) => {
  console.error('[portal-ingestion-smoke] FAIL', error)
  process.exitCode = 1
})
