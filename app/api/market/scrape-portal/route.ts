import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import { normalizePortalListingRows, type PortalDatasetKind } from '@/lib/market-source-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type PortalScrapeRequest = {
  dataset_kind?: PortalDatasetKind
  max_pages?: number
  max_listings?: number
  wait_ms?: number
  full_snapshot?: boolean
  mode?: 'preview' | 'import'
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function parseDatasetKind(value: unknown): PortalDatasetKind {
  if (value === 'portal_houses' || value === 'portal_projects') return value
  return 'portal_apartments'
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.round(parsed), min), max)
}

function logPortalFailure(stage: string, error: unknown) {
  console.error(stage, {
    code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN',
  })
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireExecutiveAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
    }

    const body = await req.json().catch(() => ({})) as PortalScrapeRequest
    const datasetKind = parseDatasetKind(body.dataset_kind)
    const mode = body.mode === 'import' ? 'import' : 'preview'
    const maxPages = boundedInteger(body.max_pages, 1, 1, 10)
    const maxListings = boundedInteger(body.max_listings, Math.min(maxPages * 48, 100), 1, 250)
    const waitMs = boundedInteger(body.wait_ms, 1_200, 300, 5_000)
    const fullSnapshot = body.full_snapshot === true

    if (fullSnapshot && (maxPages < 2 || maxListings < 80)) {
      return NextResponse.json(
        { error: 'Un snapshot completo requiere al menos 2 páginas y capacidad para 80 publicaciones. Evitamos marcar retiros con una captura parcial.' },
        { status: 400 },
      )
    }

    const collection = await collectPortalVitacura({
      datasetKind,
      commune: 'vitacura-metropolitana',
      operation: 'venta',
      maxPages,
      maxListings,
      waitMs,
    })

    const normalized = normalizePortalListingRows(collection.rows)
    const validRows = normalized.filter((row) => row.source_listing_id && row.url)
    const summary = {
      datasetKind,
      searchPages: collection.searchUrls.length,
      discovered: collection.listingUrls.length,
      parsed: collection.rows.length,
      valid: validRows.length,
      failed: collection.failures.length,
      fullSnapshot,
    }

    if (mode === 'preview') {
      return NextResponse.json({
        mode,
        source: 'portal_inmobiliario_vitacura',
        observedAt: collection.observedAt,
        summary,
        preview: validRows.slice(0, 12),
        failures: collection.failures.slice(0, 20),
        searchUrls: collection.searchUrls,
        message: 'Scraping de Portal completado en modo vista previa. No se modificaron datos productivos.',
      })
    }

    if (!validRows.length) {
      return NextResponse.json({ error: 'Portal no produjo publicaciones válidas para importar.', summary, failures: collection.failures }, { status: 422 })
    }

    const supabase = getServiceClient()
    const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot', {
      p_source_label: 'portal_inmobiliario_vitacura',
      p_source_file: `portal-scrape-${datasetKind}-${collection.observedAt}.json`,
      p_dataset_kind: datasetKind,
      p_observed_at: collection.observedAt,
      p_rows: validRows,
      p_full_snapshot: fullSnapshot,
    })
    if (pipelineError) {
      logPortalFailure('PORTAL_SCRAPE_IMPORT_FAILED', pipelineError)
      return NextResponse.json({ error: 'No fue posible guardar las publicaciones recopiladas.' }, { status: 500 })
    }

    return NextResponse.json({
      mode,
      source: 'portal_inmobiliario_vitacura',
      observedAt: collection.observedAt,
      summary: {
        ...summary,
        received: Number(pipelineResult?.received ?? 0),
        accepted: Number(pipelineResult?.accepted ?? 0),
        rejected: Number(pipelineResult?.rejected ?? 0),
        new: Number(pipelineResult?.new ?? 0),
        updated: Number(pipelineResult?.updated ?? 0),
        unchanged: Number(pipelineResult?.unchanged ?? 0),
        removed: Number(pipelineResult?.removed ?? 0),
        runId: pipelineResult?.run_id ?? null,
        sourceId: pipelineResult?.source_id ?? null,
      },
      failures: collection.failures.slice(0, 20),
      message: `Portal Vitacura procesado: ${Number(pipelineResult?.accepted ?? 0)} aceptadas, ${Number(pipelineResult?.rejected ?? 0)} rechazadas.`,
    })
  } catch (error) {
    logPortalFailure('PORTAL_SCRAPE_FAILED', error)
    return NextResponse.json(
      { error: 'No fue posible ejecutar el scraping de Portal.' },
      { status: 500 },
    )
  }
}
