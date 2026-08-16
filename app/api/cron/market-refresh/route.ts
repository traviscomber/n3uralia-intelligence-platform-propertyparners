import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATASETS: PortalDatasetKind[] = ['portal_apartments', 'portal_houses', 'portal_projects']
const MAX_LISTINGS_PER_DATASET = 12
const WAIT_MS = 600
const SOFT_RUNTIME_BUDGET_MS = 240_000

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

function classifyCollectorFailure(cause: unknown) {
  const message = cause instanceof Error ? cause.message.toLowerCase() : ''
  if (message.includes('could not find chrome') || message.includes('browser was not found') || message.includes('executable') && message.includes('not found')) {
    return 'COLLECTOR_BROWSER_EXECUTABLE_MISSING'
  }
  if (message.includes('failed to launch') || message.includes('browser launch')) return 'COLLECTOR_BROWSER_LAUNCH_FAILED'
  if (message.includes('http 403')) return 'COLLECTOR_SOURCE_FORBIDDEN'
  if (message.includes('http 429')) return 'COLLECTOR_SOURCE_RATE_LIMITED'
  if (message.includes('timeout') || message.includes('timed out')) return 'COLLECTOR_SOURCE_TIMEOUT'
  if (message.includes('net::') || message.includes('network')) return 'COLLECTOR_NETWORK_FAILURE'
  return 'COLLECTOR_UNKNOWN_FAILURE'
}

async function recordCollectionFailure(
  supabase: ReturnType<typeof getServiceClient>,
  datasetKind: PortalDatasetKind,
  failureCode: string,
  counts?: { discovered?: number; parsed?: number; collectionFailures?: number },
) {
  const recordedAt = new Date().toISOString()
  await supabase.from('market_ingestion_runs').insert({
    source_system: 'portal_inmobiliario',
    dataset_kind: datasetKind,
    source_file: `portal-cron-collection-${datasetKind}-${recordedAt}.json`,
    expected_rows: null,
    received_rows: 0,
    accepted_rows: 0,
    rejected_rows: 0,
    status: 'failed',
    completed_at: recordedAt,
    error_message: failureCode,
    metadata: {
      pipeline: 'portal_collection_v2',
      stage: 'collection',
      failure_code: failureCode,
      discovered: counts?.discovered ?? null,
      parsed: counts?.parsed ?? null,
      collection_failures: counts?.collectionFailures ?? null,
    },
  })
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = getServiceClient()
  const results: Array<Record<string, unknown>> = []
  let totalAccepted = 0
  let totalRejected = 0
  let totalLinked = 0
  let totalUnlinked = 0
  let totalFailures = 0
  let skippedForRuntimeBudget = 0
  let skippedForLock = 0

  for (const datasetKind of DATASETS) {
    if (Date.now() - startedAt >= SOFT_RUNTIME_BUDGET_MS) {
      skippedForRuntimeBudget += 1
      results.push({ datasetKind, status: 'skipped_runtime_budget' })
      continue
    }

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
        const failureCode = 'COLLECTOR_NO_VALID_ROWS'
        totalFailures += 1
        await recordCollectionFailure(supabase, datasetKind, failureCode, {
          discovered: collection.listingUrls.length,
          parsed: collection.rows.length,
          collectionFailures: collection.failures.length,
        })
        results.push({
          datasetKind,
          observedAt: collection.observedAt,
          discovered: collection.listingUrls.length,
          parsed: collection.rows.length,
          valid: 0,
          collectionFailures: collection.failures.length,
          status: 'no_valid_rows',
          failureCode,
        })
        continue
      }

      const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
        p_source_label: 'portal_inmobiliario_vitacura',
        p_source_file: `portal-cron-${datasetKind}-${collection.observedAt}.json`,
        p_dataset_kind: datasetKind,
        p_observed_at: collection.observedAt,
        p_rows: validRows,
        p_full_snapshot: false,
      })

      if (pipelineError || pipelineResult?.failed) {
        totalFailures += 1
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

      if (pipelineResult?.skipped) {
        skippedForLock += 1
        results.push({
          datasetKind,
          observedAt: collection.observedAt,
          discovered: collection.listingUrls.length,
          parsed: collection.rows.length,
          valid: validRows.length,
          collectionFailures: collection.failures.length,
          status: 'skipped_ingestion_lock',
        })
        continue
      }

      const accepted = Number(pipelineResult?.accepted ?? 0)
      const rejected = Number(pipelineResult?.rejected ?? 0)
      const linked = Number(pipelineResult?.linked ?? 0)
      const unlinked = Number(pipelineResult?.unlinked ?? 0)
      totalAccepted += accepted
      totalRejected += rejected
      totalLinked += linked
      totalUnlinked += unlinked

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
        linked,
        unlinked,
        new: Number(pipelineResult?.new ?? 0),
        updated: Number(pipelineResult?.updated ?? 0),
        unchanged: Number(pipelineResult?.unchanged ?? 0),
        removed: Number(pipelineResult?.removed ?? 0),
        runId: pipelineResult?.run_id ?? null,
      })
    } catch (cause) {
      const failureCode = classifyCollectorFailure(cause)
      totalFailures += 1
      await recordCollectionFailure(supabase, datasetKind, failureCode).catch(() => undefined)
      results.push({ datasetKind, status: 'failed', failureCode })
    }
  }

  const completedDatasets = results.filter((result) => result.status === 'completed').length
  const ok = completedDatasets === DATASETS.length
    && totalFailures === 0
    && skippedForRuntimeBudget === 0
    && skippedForLock === 0

  return NextResponse.json(
    {
      ok,
      fullSnapshot: false,
      canonicalCreation: false,
      maxListingsPerDataset: MAX_LISTINGS_PER_DATASET,
      completedDatasets,
      expectedDatasets: DATASETS.length,
      totalAccepted,
      totalRejected,
      totalLinked,
      totalUnlinked,
      totalFailures,
      skippedForRuntimeBudget,
      skippedForLock,
      runtimeMs: Date.now() - startedAt,
      results,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
