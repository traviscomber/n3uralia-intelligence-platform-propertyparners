import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const DATASETS: PortalDatasetKind[] = ['portal_apartments', 'portal_houses', 'portal_projects']

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service-role credentials')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') return new NextResponse(null, { status: 404 })

  const supabase = getServiceClient()
  const results: Array<Record<string, unknown>> = []

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
    if (!row) {
      results.push({ datasetKind, status: 'no_valid_row', discovered: collection.listingUrls.length, parsed: collection.rows.length })
      continue
    }

    const { data, error } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
      p_source_label: 'portal_inmobiliario_vitacura',
      p_source_file: `qalito-service-role-smoke-${datasetKind}-${row.source_listing_id}.json`,
      p_dataset_kind: datasetKind,
      p_observed_at: collection.observedAt,
      p_rows: [row],
      p_full_snapshot: false,
    })

    results.push({
      datasetKind,
      sourceListingId: row.source_listing_id,
      error: error?.message ?? null,
      result: data ?? null,
    })
  }

  const ok = results.length === DATASETS.length && results.every((entry) => {
    const result = entry.result as Record<string, unknown> | null | undefined
    return !entry.error && result && result.failed !== true && Number(result.accepted ?? 0) >= 1
  })

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
