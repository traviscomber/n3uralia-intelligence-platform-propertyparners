import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  collectPortalListingDetails,
  discoverPortalVitacuraUniverse,
  portalListingIdFromUrl,
} from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// V1 contractual scope: houses for sale in Vitacura. Apartments and projects remain V2.
const DATASETS: PortalDatasetKind[] = ['portal_houses']
const MAX_DISCOVERY_PAGES = 40
const MAX_DETAIL_LISTINGS_PER_RUN = 48
const DISCOVERY_WAIT_MS = 150
const DETAIL_WAIT_MS = 300
const MIN_COMPLETE_INVENTORY_LISTINGS = 30
const DETAIL_RUNTIME_GUARD_MS = 210_000
const RAW_INSERT_CHUNK = 400

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
      pipeline: 'portal_inventory_discovery_v1',
      stage: 'collection',
      failure_code: failureCode,
      discovered: counts?.discovered ?? null,
      parsed: counts?.parsed ?? null,
      collection_failures: counts?.collectionFailures ?? null,
      full_snapshot: false,
    },
  })
}

async function latestCompleteInventoryRun(
  supabase: ReturnType<typeof getServiceClient>,
  datasetKind: PortalDatasetKind,
) {
  const { data } = await supabase
    .from('market_ingestion_runs')
    .select('id,metadata,started_at')
    .eq('dataset_kind', datasetKind)
    .order('started_at', { ascending: false })
    .limit(30)

  return (data ?? []).find((run) => {
    const metadata = run.metadata && typeof run.metadata === 'object'
      ? run.metadata as Record<string, unknown>
      : null
    return metadata?.pipeline === 'portal_inventory_discovery_v1' && metadata?.full_snapshot === true
  }) ?? null
}

async function loadInventoryIds(
  supabase: ReturnType<typeof getServiceClient>,
  runId: string | null | undefined,
) {
  if (!runId) return new Set<string>()
  const ids = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('market_raw_records')
      .select('source_record_id')
      .eq('ingestion_run_id', runId)
      .range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) {
      if (row.source_record_id) ids.add(String(row.source_record_id))
    }
    if ((data ?? []).length < 1000) break
  }
  return ids
}

function rotatedDetailBatch(urls: string[], observedAt: string) {
  if (urls.length <= MAX_DETAIL_LISTINGS_PER_RUN) return urls
  const day = Math.floor(new Date(observedAt).getTime() / 86_400_000)
  const start = (day * MAX_DETAIL_LISTINGS_PER_RUN) % urls.length
  return Array.from(
    { length: MAX_DETAIL_LISTINGS_PER_RUN },
    (_, index) => urls[(start + index) % urls.length],
  )
}

async function persistInventoryRun(args: {
  supabase: ReturnType<typeof getServiceClient>
  datasetKind: PortalDatasetKind
  observedAt: string
  urls: string[]
  discovery: {
    pagesVisited: number
    newListingsPerPage: number[]
    rawListingCandidates: number
    duplicateListingCandidates: number
    uniqueListings: number
    exhausted: boolean
    capped: boolean
  }
  fullSnapshot: boolean
  previousRunId: string | null
}) {
  const { supabase, datasetKind, observedAt, urls, discovery, fullSnapshot, previousRunId } = args
  const currentIds = new Set(
    urls
      .map((url) => portalListingIdFromUrl(url, datasetKind))
      .filter((value): value is string => Boolean(value)),
  )
  const previousIds = fullSnapshot ? await loadInventoryIds(supabase, previousRunId) : new Set<string>()
  const newListings = fullSnapshot ? [...currentIds].filter((id) => !previousIds.has(id)).length : 0
  const removedListings = fullSnapshot ? [...previousIds].filter((id) => !currentIds.has(id)).length : 0
  const unchangedListings = fullSnapshot ? [...currentIds].filter((id) => previousIds.has(id)).length : 0
  const sourceFile = `portal-inventory-${datasetKind}-${observedAt}.json`
  const sourceSha256 = createHash('sha256').update([...currentIds].sort().join('\n')).digest('hex')

  const { data: run, error: runError } = await supabase
    .from('market_ingestion_runs')
    .insert({
      source_system: 'portal_inmobiliario',
      dataset_kind: datasetKind,
      source_file: sourceFile,
      source_sha256: sourceSha256,
      expected_rows: null,
      received_rows: currentIds.size,
      accepted_rows: currentIds.size,
      rejected_rows: 0,
      status: 'completed',
      completed_at: observedAt,
      metadata: {
        pipeline: 'portal_inventory_discovery_v1',
        stage: 'inventory_presence',
        full_snapshot: fullSnapshot,
        discovery_pages: discovery.pagesVisited,
        discovery_new_listings_per_page: discovery.newListingsPerPage,
        discovery_raw_candidates: discovery.rawListingCandidates,
        discovery_unique_listings: currentIds.size,
        discovery_duplicate_candidates: discovery.duplicateListingCandidates,
        discovery_exhausted: discovery.exhausted,
        discovery_capped: discovery.capped,
        new_listings: newListings,
        removed_listings: removedListings,
        unchanged_listings: unchangedListings,
        previous_complete_run_id: previousRunId,
      },
    })
    .select('id')
    .single()

  if (runError || !run?.id) throw runError ?? new Error('INVENTORY_RUN_NOT_CREATED')

  const records = urls.flatMap((url, index) => {
    const sourceRecordId = portalListingIdFromUrl(url, datasetKind)
    if (!sourceRecordId) return []
    return [{
      ingestion_run_id: run.id,
      source_system: 'portal_inmobiliario',
      dataset_kind: datasetKind,
      source_record_id: sourceRecordId,
      source_file: sourceFile,
      source_row_number: index + 1,
      record_hash: createHash('sha256').update(url).digest('hex'),
      payload: { url, inventory_presence: true },
      observed_at: observedAt,
      validation_status: 'accepted',
      validation_errors: [],
    }]
  })

  for (let offset = 0; offset < records.length; offset += RAW_INSERT_CHUNK) {
    const { error } = await supabase
      .from('market_raw_records')
      .insert(records.slice(offset, offset + RAW_INSERT_CHUNK))
    if (error) throw error
  }

  return {
    runId: run.id as string,
    inventoryCount: currentIds.size,
    newListings,
    removedListings,
    unchangedListings,
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = getServiceClient()
  const results: Array<Record<string, unknown>> = []
  let totalFailures = 0
  let completeInventories = 0
  let detailEnrichmentFailures = 0

  for (const datasetKind of DATASETS) {
    try {
      const previousCompleteRun = await latestCompleteInventoryRun(supabase, datasetKind)
      const inventory = await discoverPortalVitacuraUniverse({
        datasetKind,
        commune: 'vitacura-metropolitana',
        operation: 'venta',
        maxPages: MAX_DISCOVERY_PAGES,
        waitMs: DISCOVERY_WAIT_MS,
      })

      const fullSnapshot = inventory.discovery.exhausted
        && !inventory.discovery.capped
        && inventory.listingUrls.length >= MIN_COMPLETE_INVENTORY_LISTINGS

      const persistedInventory = await persistInventoryRun({
        supabase,
        datasetKind,
        observedAt: inventory.observedAt,
        urls: inventory.listingUrls,
        discovery: inventory.discovery,
        fullSnapshot,
        previousRunId: previousCompleteRun?.id ?? null,
      })

      if (!fullSnapshot) {
        totalFailures += 1
        results.push({
          datasetKind,
          status: 'partial_inventory',
          observedAt: inventory.observedAt,
          inventory: persistedInventory,
          discovery: inventory.discovery,
          detailStatus: 'skipped_until_complete_inventory',
        })
        continue
      }

      completeInventories += 1

      if (Date.now() - startedAt >= DETAIL_RUNTIME_GUARD_MS) {
        results.push({
          datasetKind,
          status: 'completed',
          observedAt: inventory.observedAt,
          inventory: persistedInventory,
          discovery: inventory.discovery,
          detailStatus: 'skipped_runtime_guard',
        })
        continue
      }

      const detailUrls = rotatedDetailBatch(inventory.listingUrls, inventory.observedAt)
      const details = await collectPortalListingDetails({
        datasetKind,
        listingUrls: detailUrls,
        waitMs: DETAIL_WAIT_MS,
      })
      const normalized = normalizePortalListingRows(details.rows)
      const validRows = normalized.filter((row) => row.source_listing_id && row.url)

      let detailResult: Record<string, unknown> = {
        requested: detailUrls.length,
        parsed: details.rows.length,
        valid: validRows.length,
        failures: details.failures.length,
      }

      if (validRows.length) {
        const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
          p_source_label: 'portal_inmobiliario_vitacura',
          p_source_file: `portal-detail-enrichment-${datasetKind}-${details.observedAt}.json`,
          p_dataset_kind: datasetKind,
          p_observed_at: details.observedAt,
          p_rows: validRows,
          // Presence/removal is owned by the complete inventory run above.
          // A bounded detail batch must never mark unseen listings as removed.
          p_full_snapshot: false,
        })

        if (pipelineError || pipelineResult?.failed) {
          detailEnrichmentFailures += 1
          detailResult = { ...detailResult, status: 'ingestion_failed' }
        } else if (pipelineResult?.skipped) {
          detailResult = { ...detailResult, status: 'skipped_ingestion_lock' }
        } else {
          detailResult = {
            ...detailResult,
            status: 'completed',
            accepted: Number(pipelineResult?.accepted ?? 0),
            rejected: Number(pipelineResult?.rejected ?? 0),
            linked: Number(pipelineResult?.linked ?? 0),
            unlinked: Number(pipelineResult?.unlinked ?? 0),
            new: Number(pipelineResult?.new ?? 0),
            updated: Number(pipelineResult?.updated ?? 0),
            unchanged: Number(pipelineResult?.unchanged ?? 0),
            runId: pipelineResult?.run_id ?? null,
          }
        }
      } else {
        detailEnrichmentFailures += 1
        detailResult = { ...detailResult, status: 'no_valid_rows' }
      }

      results.push({
        datasetKind,
        status: 'completed',
        observedAt: inventory.observedAt,
        inventory: persistedInventory,
        discovery: inventory.discovery,
        detailStatus: detailResult,
      })
    } catch (cause) {
      const failureCode = classifyCollectorFailure(cause)
      totalFailures += 1
      await recordCollectionFailure(supabase, datasetKind, failureCode).catch(() => undefined)
      results.push({ datasetKind, status: 'failed', failureCode })
    }
  }

  const ok = completeInventories === DATASETS.length && totalFailures === 0

  return NextResponse.json(
    {
      ok,
      fullSnapshot: completeInventories === DATASETS.length,
      inventoryPipeline: 'portal_inventory_discovery_v1',
      detailPipeline: 'unit_portal_listing_v2',
      maxDiscoveryPages: MAX_DISCOVERY_PAGES,
      maxDetailListingsPerRun: MAX_DETAIL_LISTINGS_PER_RUN,
      completeInventories,
      expectedDatasets: DATASETS.length,
      totalFailures,
      detailEnrichmentFailures,
      runtimeMs: Date.now() - startedAt,
      results,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
