import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  collectPortalListingDetailsViaBrightData,
  discoverPortalVitacuraViaBrightData,
} from '@/lib/brightdata-portal-collector'
import { portalListingIdFromUrl } from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, portalListingMatchesVitacuraScope, type PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const DATASETS: PortalDatasetKind[] = ['portal_houses', 'portal_apartments']
const DISCOVERY_PAGES_PER_DATASET = 1
const MAX_NEW_DETAILS_PER_DATASET = 12
const EXISTING_PRICE_PROBES_PER_DATASET = 2
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

async function latestFullInventoryRun(
  supabase: ReturnType<typeof getServiceClient>,
  datasetKind: PortalDatasetKind,
) {
  const { data, error } = await supabase
    .from('market_ingestion_runs')
    .select('id,started_at,metadata')
    .eq('source_system', 'portal_inmobiliario')
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
  runId: string,
) {
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

async function loadCurrentListingIds(
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

  const ids = new Set<string>()
  if (!source?.id) return ids

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('market_current_listings')
      .select('source_listing_id')
      .eq('source_id', source.id)
      .range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) {
      if (row.source_listing_id) ids.add(String(row.source_listing_id))
    }
    if ((data ?? []).length < 1000) break
  }
  return ids
}

async function recordDeltaRun(args: {
  supabase: ReturnType<typeof getServiceClient>
  datasetKind: PortalDatasetKind
  observedAt: string
  baselineRunId: string
  baselineStartedAt: string
  discovered: number
  newCandidates: number
  requestedDetails: number
  priceProbes: number
  parsedDetails: number
  scopeRejected: number
  failures: number
}) {
  const { error } = await args.supabase.from('market_ingestion_runs').insert({
    source_system: 'portal_inmobiliario',
    dataset_kind: args.datasetKind,
    source_file: `portal-daily-delta-${args.datasetKind}-${args.observedAt}.json`,
    expected_rows: null,
    received_rows: args.discovered,
    accepted_rows: args.parsedDetails,
    rejected_rows: args.failures,
    status: args.failures === 0 ? 'completed' : 'partial',
    completed_at: args.observedAt,
    metadata: {
      pipeline: 'portal_daily_delta_v1',
      collector_provider: 'brightdata',
      full_snapshot: false,
      discovery_pages: DISCOVERY_PAGES_PER_DATASET,
      discovery_unique_listings: args.discovered,
      baseline_full_inventory_run_id: args.baselineRunId,
      baseline_started_at: args.baselineStartedAt,
      new_candidates: args.newCandidates,
      requested_details: args.requestedDetails,
      existing_price_probes: args.priceProbes,
      parsed_details: args.parsedDetails,
      scope_rejected: args.scopeRejected,
      scope_policy: 'vitacura_explicit_fail_closed_v1',
      detail_failures: args.failures,
      removal_reconciliation: 'deferred_to_full_inventory',
      provider_request_floor: DISCOVERY_PAGES_PER_DATASET,
      provider_request_ceiling: DISCOVERY_PAGES_PER_DATASET + args.requestedDetails * 2,
    },
  })
  if (error) throw error
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry_run') === '1'
  const previewDryRun = dryRun
    && process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'feat/brightdata-daily-delta-20261002'

  if (!authorized(request) && !previewDryRun) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!previewDryRun && !scheduledWindow()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'outside_0730_america_santiago',
      timeZone: CHILE_TIME_ZONE,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (!process.env.BRIGHTDATA_API_KEY) {
    return NextResponse.json({ ok: false, error: 'BRIGHTDATA_API_KEY_MISSING' }, { status: 503 })
  }

  const startedAt = Date.now()
  const supabase = getServiceClient()
  const results: Array<Record<string, unknown>> = []
  let totalFailures = 0
  let totalProviderRequestsUpperBound = 0

  for (const datasetKind of DATASETS) {
    try {
      const baseline = await latestFullInventoryRun(supabase, datasetKind)
      if (!baseline?.id || !baseline?.started_at) throw new Error('NO_FULL_INVENTORY_BASELINE')

      const [baselineIds, currentIds, discovery] = await Promise.all([
        loadInventoryIds(supabase, String(baseline.id)),
        loadCurrentListingIds(supabase, datasetKind),
        discoverPortalVitacuraViaBrightData({
          datasetKind,
          commune: 'vitacura-metropolitana',
          operation: 'venta',
          maxPages: DISCOVERY_PAGES_PER_DATASET,
        }),
      ])

      const newUrls = discovery.listingUrls.filter((url) => {
        const id = portalListingIdFromUrl(url, datasetKind)
        return Boolean(id) && !baselineIds.has(String(id)) && !currentIds.has(String(id))
      })

      const knownUrls = discovery.listingUrls.filter((url) => {
        const id = portalListingIdFromUrl(url, datasetKind)
        return Boolean(id) && (baselineIds.has(String(id)) || currentIds.has(String(id)))
      })
      const dayIndex = Math.floor(Date.now() / 86_400_000)
      const probeOffset = knownUrls.length ? (dayIndex * EXISTING_PRICE_PROBES_PER_DATASET) % knownUrls.length : 0
      const existingPriceProbes = knownUrls.length
        ? Array.from(
            { length: Math.min(EXISTING_PRICE_PROBES_PER_DATASET, knownUrls.length) },
            (_, index) => knownUrls[(probeOffset + index) % knownUrls.length],
          )
        : []

      const detailUrls = [...new Set([
        ...newUrls.slice(0, MAX_NEW_DETAILS_PER_DATASET),
        ...existingPriceProbes,
      ])]
      const details = detailUrls.length
        ? await collectPortalListingDetailsViaBrightData({
            datasetKind,
            listingUrls: detailUrls,
          })
        : { observedAt: discovery.observedAt, rows: [], failures: [] }

      const normalized = normalizePortalListingRows(details.rows, datasetKind)
      const rowsWithIdentity = normalized.filter((row) => row.source_listing_id && row.url)
      const scopedRows = rowsWithIdentity.filter((row) => portalListingMatchesVitacuraScope(row).accepted)
      const scopeRejectedRows = rowsWithIdentity.filter((row) => !portalListingMatchesVitacuraScope(row).accepted)
      const validRows = scopedRows
      let ingestion: Record<string, unknown> | null = null

      if (validRows.length && !previewDryRun) {
        const { data, error } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
          p_source_label: 'portal_inmobiliario_vitacura',
          p_source_file: `portal-daily-delta-details-${datasetKind}-${details.observedAt}.json`,
          p_dataset_kind: datasetKind,
          p_observed_at: details.observedAt,
          p_rows: validRows,
          p_full_snapshot: false,
        })
        if (error || data?.failed) throw error ?? new Error('DELTA_INGESTION_FAILED')
        ingestion = data ?? null
      }

      if (!previewDryRun) await recordDeltaRun({
        supabase,
        datasetKind,
        observedAt: details.observedAt,
        baselineRunId: String(baseline.id),
        baselineStartedAt: String(baseline.started_at),
        discovered: discovery.listingUrls.length,
        newCandidates: newUrls.length,
        requestedDetails: detailUrls.length,
        priceProbes: existingPriceProbes.length,
        parsedDetails: validRows.length,
        scopeRejected: scopeRejectedRows.length,
        failures: details.failures.length,
      })

      const requestUpperBound = DISCOVERY_PAGES_PER_DATASET + detailUrls.length * 2
      totalProviderRequestsUpperBound += requestUpperBound

      results.push({
        datasetKind,
        status: details.failures.length === 0 ? 'completed' : 'partial',
        provider: 'brightdata',
        baselineRunId: baseline.id,
        baselineStartedAt: baseline.started_at,
        scannedPages: DISCOVERY_PAGES_PER_DATASET,
        discoveredInPulse: discovery.listingUrls.length,
        newCandidates: newUrls.length,
        detailRequested: detailUrls.length,
        newDetailRequested: Math.min(newUrls.length, MAX_NEW_DETAILS_PER_DATASET),
        existingPriceProbes: existingPriceProbes.length,
        detailParsed: validRows.length,
        scopeRejected: scopeRejectedRows.length,
        scopeRejectedIds: scopeRejectedRows.map((row) => row.source_listing_id),
        detailFailures: details.failures.length,
        deferredNewCandidates: Math.max(newUrls.length - MAX_NEW_DETAILS_PER_DATASET, 0),
        requestUpperBound,
        ingestion,
      })
    } catch (error) {
      totalFailures += 1
      results.push({
        datasetKind,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    ok: totalFailures === 0,
    mode: 'brightdata_daily_delta',
    dryRun: previewDryRun,
    writes: previewDryRun ? 0 : 'bounded_delta_only',
    fullSnapshot: false,
    removalReconciliation: 'deferred_to_full_inventory',
    datasets: DATASETS,
    discoveryPagesPerDataset: DISCOVERY_PAGES_PER_DATASET,
    maxNewDetailsPerDataset: MAX_NEW_DETAILS_PER_DATASET,
    minimumProviderRequestsWhenNoChanges: DATASETS.length * (DISCOVERY_PAGES_PER_DATASET + EXISTING_PRICE_PROBES_PER_DATASET),
    existingPriceProbesPerDataset: EXISTING_PRICE_PROBES_PER_DATASET,
    totalProviderRequestsUpperBound,
    runtimeMs: Date.now() - startedAt,
    results,
  }, {
    status: totalFailures === 0 ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
