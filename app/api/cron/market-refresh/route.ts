import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATASETS: PortalDatasetKind[] = ['portal_apartments', 'portal_houses', 'portal_projects']
const MAX_LISTINGS_PER_DATASET = 24
const WAIT_MS = 600

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    console.warn('[market-refresh] unauthorized cron request', {
      authorizationPresent: Boolean(request.headers.get('authorization')),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const results: Array<Record<string, unknown>> = []
  let totalAccepted = 0
  let totalRejected = 0
  let totalFailures = 0

  for (const datasetKind of DATASETS) {
    try {
      const collection = await collectPortalVitacura({
        datasetKind,
        commune: 'vitacura-metropolitana',
        operation: 'venta',
        maxPages: 1,
        maxListings: MAX_LISTINGS_PER_DATASET,
        waitMs: WAIT_MS,
      })

      const normalized = normalizePortalListingRows(collection.rows)
      const validRows = normalized.filter((row) => row.source_listing_id && row.url)

      if (!validRows.length) {
        totalFailures += 1
        results.push({
          datasetKind,
          observedAt: collection.observedAt,
          discovered: collection.listingUrls.length,
          parsed: collection.rows.length,
          valid: 0,
          collectionFailures: collection.failures.length,
          status: 'no_valid_rows',
        })
        continue
      }

      const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot', {
        p_source_label: 'portal_inmobiliario_vitacura',
        p_source_file: `portal-cron-${datasetKind}-${collection.observedAt}.json`,
        p_dataset_kind: datasetKind,
        p_observed_at: collection.observedAt,
        p_rows: validRows,
        p_full_snapshot: false,
      })

      if (pipelineError || pipelineResult?.failed) {
        totalFailures += 1
        console.error('[market-refresh] dataset ingestion failed', {
          datasetKind,
          code: pipelineError?.code ?? 'PIPELINE_FAILED',
        })
        results.push({
          datasetKind,
          observedAt: collection.observedAt,
          discovered: collection.listingUrls.length,
          parsed: collection.rows.length,
          valid: validRows.length,
          collectionFailures: collection.failures.length,
          status: 'ingestion_failed',
          runId: pipelineResult?.run_id ?? null,
        })
        continue
      }

      const accepted = Number(pipelineResult?.accepted ?? 0)
      const rejected = Number(pipelineResult?.rejected ?? 0)
      totalAccepted += accepted
      totalRejected += rejected

      results.push({
        datasetKind,
        observedAt: collection.observedAt,
        discovered: collection.listingUrls.length,
        parsed: collection.rows.length,
        valid: validRows.length,
        collectionFailures: collection.failures.length,
        status: 'completed',
        accepted,
        rejected,
        new: Number(pipelineResult?.new ?? 0),
        updated: Number(pipelineResult?.updated ?? 0),
        unchanged: Number(pipelineResult?.unchanged ?? 0),
        removed: Number(pipelineResult?.removed ?? 0),
        runId: pipelineResult?.run_id ?? null,
      })
    } catch (cause) {
      totalFailures += 1
      console.error('[market-refresh] dataset failed', {
        datasetKind,
        message: cause instanceof Error ? cause.message : 'UNKNOWN',
      })
      results.push({ datasetKind, status: 'failed' })
    }
  }

  const ok = totalAccepted > 0 && totalFailures < DATASETS.length
  console.info('[market-refresh] cron completed', {
    ok,
    datasets: DATASETS.length,
    totalAccepted,
    totalRejected,
    totalFailures,
  })

  return NextResponse.json(
    {
      ok,
      fullSnapshot: false,
      totalAccepted,
      totalRejected,
      totalFailures,
      results,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
