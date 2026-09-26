import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireExecutiveAccess } from '@/lib/api-access'
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
const CHILE_TIME_ZONE = 'America/Santiago'

function chileClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHILE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '-1'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '-1'),
  }
}

function scheduledWindow() {
  const local = chileClock()
  return local.hour === 7 && local.minute === 30
}


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
  failureMessage?: string,
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
      failure_message: failureMessage?.slice(0, 500) ?? null,
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
  const { data, error } = await supabase
    .from('market_ingestion_runs')
    .select('id,metadata,started_at')
    .eq('dataset_kind', datasetKind)
    .eq('status', 'completed')
    .contains('metadata', { pipeline: 'portal_inventory_discovery_v1', full_snapshot: true })
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
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

async function reconcileRemovedListings(
  supabase: ReturnType<typeof getServiceClient>,
  datasetKind: PortalDatasetKind,
  observedAt: string,
  currentIds: Set<string>,
) {
  const sourceCode = `portal-inmobiliario-vitacura-${datasetKind.replaceAll('_', '-')}`
  const { data: source, error: sourceError } = await supabase
    .from('market_sources')
    .select('id')
    .eq('code', sourceCode)
    .maybeSingle()
  if (sourceError) throw sourceError
  if (!source?.id) return 0

  const removedRows: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('market_current_listings')
      .select('source_id,source_listing_id,property_id,operation,url,title,raw_address,normalized_address,latitude,longitude,price_clp,price_uf,price_uf_m2,published_at,raw_payload')
      .eq('source_id', source.id)
      .in('status', ['active', 'observed'])
      .range(offset, offset + 999)
    if (error) throw error

    for (const row of data ?? []) {
      if (!row.source_listing_id || currentIds.has(String(row.source_listing_id))) continue
      removedRows.push({
        source_id: row.source_id,
        source_listing_id: row.source_listing_id,
        property_id: row.property_id,
        operation: row.operation,
        status: 'removed',
        url: row.url,
        title: row.title,
        raw_address: row.raw_address,
        normalized_address: row.normalized_address,
        latitude: row.latitude,
        longitude: row.longitude,
        price_clp: row.price_clp,
        price_uf: row.price_uf,
        price_uf_m2: row.price_uf_m2,
        published_at: row.published_at,
        observed_at: observedAt,
        removed_at: observedAt,
        raw_payload: {
          ...(row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload as Record<string, unknown> : {}),
          inventory_reconciliation: {
            status: 'removed',
            verified_at: observedAt,
            source: 'portal_inventory_discovery_v1',
          },
        },
      })
    }
    if ((data ?? []).length < 1000) break
  }

  for (let offset = 0; offset < removedRows.length; offset += 250) {
    const { error } = await supabase.from('market_listings').insert(removedRows.slice(offset, offset + 250))
    if (error) throw error
  }
  return removedRows.length
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
    reportedResultCount: number | null
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
  const reconciledRemovedListings = fullSnapshot
    ? await reconcileRemovedListings(supabase, datasetKind, observedAt, currentIds)
    : 0
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
      accepted_rows: 0,
      rejected_rows: 0,
      status: 'running',
      completed_at: null,
      metadata: {
        pipeline: 'portal_inventory_discovery_v1',
        stage: 'persisting_inventory_presence',
        full_snapshot: false,
        discovery_pages: discovery.pagesVisited,
        discovery_new_listings_per_page: discovery.newListingsPerPage,
        discovery_raw_candidates: discovery.rawListingCandidates,
        discovery_unique_listings: currentIds.size,
        discovery_duplicate_candidates: discovery.duplicateListingCandidates,
        portal_reported_result_count: discovery.reportedResultCount,
        inventory_coverage_ratio: discovery.reportedResultCount && discovery.reportedResultCount > 0
          ? currentIds.size / discovery.reportedResultCount
          : null,
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

  try {
    for (let offset = 0; offset < records.length; offset += RAW_INSERT_CHUNK) {
      const { error } = await supabase
        .from('market_raw_records')
        .insert(records.slice(offset, offset + RAW_INSERT_CHUNK))
      if (error) throw error
    }

    const { error: completeError } = await supabase
      .from('market_ingestion_runs')
      .update({
        accepted_rows: currentIds.size,
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
          portal_reported_result_count: discovery.reportedResultCount,
          inventory_coverage_ratio: discovery.reportedResultCount && discovery.reportedResultCount > 0
            ? currentIds.size / discovery.reportedResultCount
            : null,
          discovery_exhausted: discovery.exhausted,
          discovery_capped: discovery.capped,
          new_listings: newListings,
          removed_listings: removedListings,
          unchanged_listings: unchangedListings,
          previous_complete_run_id: previousRunId,
        },
      })
      .eq('id', run.id)
    if (completeError) throw completeError
  } catch (error) {
    await supabase
      .from('market_ingestion_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'INVENTORY_PERSISTENCE_FAILED',
        metadata: {
          pipeline: 'portal_inventory_discovery_v1',
          stage: 'inventory_presence_failed',
          full_snapshot: false,
          discovery_unique_listings: currentIds.size,
          portal_reported_result_count: discovery.reportedResultCount,
        },
      })
      .eq('id', run.id)
    throw error
  }

  return {
    runId: run.id as string,
    inventoryCount: currentIds.size,
    newListings,
    removedListings,
    unchangedListings,
    reconciledRemovedListings,
  }
}


async function loadInventoryRecords(
  supabase: ReturnType<typeof getServiceClient>,
  runId: string,
) {
  const records: Array<{ sourceRecordId: string; url: string }> = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('market_raw_records')
      .select('source_record_id,payload')
      .eq('ingestion_run_id', runId)
      .range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : null
      const url = typeof payload?.url === 'string' ? payload.url : null
      if (row.source_record_id && url) records.push({ sourceRecordId: String(row.source_record_id), url })
    }
    if ((data ?? []).length < 1000) break
  }
  return records
}

async function loadCurrentListingState(
  supabase: ReturnType<typeof getServiceClient>,
  datasetKind: PortalDatasetKind,
) {
  const sourceCode = `portal-inmobiliario-vitacura-${datasetKind.replaceAll('_', '-')}`
  const { data: source, error: sourceError } = await supabase
    .from('market_sources')
    .select('id')
    .eq('code', sourceCode)
    .maybeSingle()
  if (sourceError) throw sourceError
  const byId = new Map<string, { propertyId: string | null; observedAt: string | null; latitude: number | null; longitude: number | null }>()
  if (!source?.id) return { sourceId: null, byId }

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('market_current_listings')
      .select('source_listing_id,property_id,observed_at,latitude,longitude')
      .eq('source_id', source.id)
      .range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) {
      if (row.source_listing_id) {
        byId.set(String(row.source_listing_id), {
          propertyId: row.property_id ? String(row.property_id) : null,
          observedAt: row.observed_at ? String(row.observed_at) : null,
          latitude: typeof row.latitude === 'number' ? row.latitude : row.latitude != null ? Number(row.latitude) : null,
          longitude: typeof row.longitude === 'number' ? row.longitude : row.longitude != null ? Number(row.longitude) : null,
        })
      }
    }
    if ((data ?? []).length < 1000) break
  }
  return { sourceId: String(source.id), byId }
}

async function drainLatestInventoryDetails(args: {
  supabase: ReturnType<typeof getServiceClient>
  datasetKind: PortalDatasetKind
  startedAt: number
}) {
  const { supabase, datasetKind, startedAt } = args
  const latest = await latestCompleteInventoryRun(supabase, datasetKind)
  if (!latest?.id) throw new Error('NO_COMPLETE_INVENTORY_RUN')

  const [inventory, current] = await Promise.all([
    loadInventoryRecords(supabase, String(latest.id)),
    loadCurrentListingState(supabase, datasetKind),
  ])

  const snapshotStartedAt = new Date(String(latest.started_at)).getTime()
  const absent = inventory.filter((item) => !current.byId.has(item.sourceRecordId))
  const missingGeo = inventory.filter((item) => {
    const state = current.byId.get(item.sourceRecordId)
    return Boolean(state) && (state!.latitude == null || state!.longitude == null)
  })
  const staleUnlinked = inventory.filter((item) => {
    const state = current.byId.get(item.sourceRecordId)
    if (!state || state.propertyId !== null) return false
    const observedAt = state.observedAt ? new Date(state.observedAt).getTime() : 0
    return observedAt < snapshotStartedAt
  })

  // Territory is higher-value than identity recency here: first recover missing
  // coordinates, then fill absent detail rows, then refresh stale unlinked rows.
  // De-duplicate by listing id so one Portal request can satisfy multiple needs.
  const queueById = new Map<string, (typeof inventory)[number]>()
  for (const item of [...missingGeo, ...absent, ...staleUnlinked]) {
    if (!queueById.has(item.sourceRecordId)) queueById.set(item.sourceRecordId, item)
  }
  const queue = [...queueById.values()]
  const chunkSize = 18
  let processed = 0
  let parsed = 0
  let accepted = 0
  let rejected = 0
  let linked = 0
  let unlinkedCount = 0
  let collectionFailures = 0
  let ingestionFailures = 0

  for (let offset = 0; offset < queue.length; offset += chunkSize) {
    if (Date.now() - startedAt >= 235_000) break
    const chunk = queue.slice(offset, offset + chunkSize)
    const details = await collectPortalListingDetails({
      datasetKind,
      listingUrls: chunk.map((item) => item.url),
      waitMs: DETAIL_WAIT_MS,
    })
    collectionFailures += details.failures.length
    parsed += details.rows.length

    const normalized = normalizePortalListingRows(details.rows)
    const validRows = normalized.filter((row) => row.source_listing_id && row.url)
    if (validRows.length) {
      const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
        p_source_label: 'portal_inmobiliario_vitacura',
        p_source_file: `portal-detail-drain-${datasetKind}-${details.observedAt}.json`,
        p_dataset_kind: datasetKind,
        p_observed_at: details.observedAt,
        p_rows: validRows,
        p_full_snapshot: false,
      })

      if (pipelineError || pipelineResult?.failed) {
        ingestionFailures += 1
      } else if (!pipelineResult?.skipped) {
        accepted += Number(pipelineResult?.accepted ?? 0)
        rejected += Number(pipelineResult?.rejected ?? 0)
        linked += Number(pipelineResult?.linked ?? 0)
        unlinkedCount += Number(pipelineResult?.unlinked ?? 0)
      }
    }
    processed += chunk.length
  }

  const remainingEstimate = Math.max(queue.length - processed, 0)
  return {
    runId: latest.id,
    inventory: inventory.length,
    currentBefore: current.byId.size,
    absentBefore: absent.length,
    missingGeoBefore: missingGeo.length,
    staleUnlinkedBefore: staleUnlinked.length,
    queued: queue.length,
    processed,
    parsed,
    accepted,
    rejected,
    linked,
    unlinked: unlinkedCount,
    collectionFailures,
    ingestionFailures,
    remainingEstimate,
    runtimeMs: Date.now() - startedAt,
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  const fullSweep = url.searchParams.get('full') === '1'
  const detailsOnly = url.searchParams.get('details_only') === '1'
  if (force) {
    const access = await requireExecutiveAccess()
    if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  } else {
    if (!authorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!detailsOnly && !scheduledWindow()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'outside_0730_america_santiago',
        timeZone: CHILE_TIME_ZONE,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
  }

  const startedAt = Date.now()
  const supabase = getServiceClient()

  if (detailsOnly) {
    try {
      const detailDrain = await drainLatestInventoryDetails({
        supabase,
        datasetKind: 'portal_houses',
        startedAt,
      })
      const { data: intelligenceRefresh, error: intelligenceError } = await supabase
        .rpc('refresh_market_listing_property_match_candidates_v1')
      const { data: neighborhoodRefresh, error: neighborhoodError } = await supabase
        .rpc('refresh_market_neighborhood_learning_v1')
      const { data: prospectRefresh, error: prospectError } = await supabase
        .rpc('refresh_property_prospect_leads_v1')

      const sourceCode = 'portal-inmobiliario-vitacura-portal-houses'
      const { data: source } = await supabase
        .from('market_sources')
        .select('id')
        .eq('code', sourceCode)
        .maybeSingle()

      let identityState = { live: 0, linked: 0, unlinked: 0, strongCandidates: 0, mediumCandidates: 0 }
      if (source?.id) {
        const [{ count: live }, { count: linked }, { count: unlinked }, { count: strongCandidates }, { count: mediumCandidates }] = await Promise.all([
          supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('source_id', source.id).in('status', ['active','observed']),
          supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('source_id', source.id).in('status', ['active','observed']).not('property_id', 'is', null),
          supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('source_id', source.id).in('status', ['active','observed']).is('property_id', null),
          supabase.from('market_property_matches').select('id', { count: 'exact', head: true }).eq('left_entity_type','listing').eq('right_entity_type','property').eq('status','candidate_high'),
          supabase.from('market_property_matches').select('id', { count: 'exact', head: true }).eq('left_entity_type','listing').eq('right_entity_type','property').eq('status','candidate_medium'),
        ])
        identityState = {
          live: live ?? 0,
          linked: linked ?? 0,
          unlinked: unlinked ?? 0,
          strongCandidates: strongCandidates ?? 0,
          mediumCandidates: mediumCandidates ?? 0,
        }
      }

      return NextResponse.json({
        ok: detailDrain.ingestionFailures === 0 && !intelligenceError && !neighborhoodError && !prospectError,
        mode: 'details_only',
        datasetKind: 'portal_houses',
        ...detailDrain,
        intelligence: {
          refresh: intelligenceRefresh ?? null,
          error: intelligenceError?.message ?? null,
          identityState,
        },
        neighborhood: {
          refresh: neighborhoodRefresh ?? null,
          error: neighborhoodError?.message ?? null,
        },
        prospects: {
          refresh: prospectRefresh ?? null,
          error: prospectError?.message ?? null,
        },
      }, { status: detailDrain.ingestionFailures === 0 && !intelligenceError && !neighborhoodError && !prospectError ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : String(cause)
      console.error('[market-refresh] detail drain failed', { failureMessage })
      return NextResponse.json({
        ok: false,
        mode: 'details_only',
        error: failureMessage,
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  }

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

      const coverageRatio = inventory.discovery.reportedResultCount && inventory.discovery.reportedResultCount > 0
        ? inventory.listingUrls.length / inventory.discovery.reportedResultCount
        : null
      const fullSnapshot = inventory.discovery.exhausted
        && !inventory.discovery.capped
        && inventory.listingUrls.length >= MIN_COMPLETE_INVENTORY_LISTINGS
        && coverageRatio != null
        && coverageRatio >= 0.97
        && coverageRatio <= 1.05

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
          coverageRatio,
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
          coverageRatio,
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
        coverageRatio,
        detailStatus: detailResult,
      })
    } catch (cause) {
      const failureCode = classifyCollectorFailure(cause)
      totalFailures += 1
      const failureMessage = cause instanceof Error ? cause.message : String(cause)
      console.error('[market-refresh] collector failed', { datasetKind, failureCode, failureMessage })
      await recordCollectionFailure(supabase, datasetKind, failureCode, undefined, failureMessage).catch(() => undefined)
      results.push({ datasetKind, status: 'failed', failureCode })
    }
  }

  let identityIntelligence: unknown = null
  let identityIntelligenceError: string | null = null
  let neighborhoodLearning: unknown = null
  let neighborhoodLearningError: string | null = null
  let prospectPipeline: unknown = null
  let prospectPipelineError: string | null = null

  if (completeInventories === DATASETS.length) {
    const identityResult = await supabase.rpc('refresh_market_listing_property_match_candidates_v1')
    identityIntelligence = identityResult.data ?? null
    identityIntelligenceError = identityResult.error?.message ?? null

    const learningResult = await supabase.rpc('refresh_market_neighborhood_learning_v1')
    neighborhoodLearning = learningResult.data ?? null
    neighborhoodLearningError = learningResult.error?.message ?? null

    const prospectResult = await supabase.rpc('refresh_property_prospect_leads_v1')
    prospectPipeline = prospectResult.data ?? null
    prospectPipelineError = prospectResult.error?.message ?? null
  }

  const ok = completeInventories === DATASETS.length
    && totalFailures === 0
    && !identityIntelligenceError
    && !neighborhoodLearningError
    && !prospectPipelineError

  return NextResponse.json(
    {
      ok,
      fullSnapshot: completeInventories === DATASETS.length,
      inventoryPipeline: 'portal_inventory_discovery_v1',
      detailPipeline: 'unit_portal_listing_v2',
      maxDiscoveryPages: MAX_DISCOVERY_PAGES,
      maxDetailListingsPerRun: fullSweep ? 'all_discovered' : MAX_DETAIL_LISTINGS_PER_RUN,
      fullSweep,
      completeInventories,
      expectedDatasets: DATASETS.length,
      totalFailures,
      detailEnrichmentFailures,
      identityIntelligence: {
        refresh: identityIntelligence,
        error: identityIntelligenceError,
      },
      neighborhoodLearning: {
        refresh: neighborhoodLearning,
        error: neighborhoodLearningError,
      },
      prospectPipeline: {
        refresh: prospectPipeline,
        error: prospectPipelineError,
      },
      runtimeMs: Date.now() - startedAt,
      results,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
