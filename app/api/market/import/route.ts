import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'
import { requireExecutiveAccess } from '@/lib/api-access'
import {
  normalizeBenchmarkImportRows,
  normalizeMarketImportRows,
  parseMarketImportBuffer,
  type MarketImportInputRow,
  type NormalizedBenchmarkImportRow,
  type NormalizedMarketImportRow,
} from '@/lib/market-import'
import {
  normalizeCbrsTransactionRows,
  normalizePortalListingRows,
  type PortalDatasetKind,
} from '@/lib/market-source-import'

export const dynamic = 'force-dynamic'

type ImportMode = 'preview' | 'import'
type ImportKind = 'market_data' | 'benchmark_data' | 'portal_listings' | 'cbrs_transactions'
type SourceSystem = 'portal_inmobiliario' | 'cbrs' | 'client' | 'kml' | 'manual_import'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials')
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function parseMode(value: string | null): ImportMode {
  return value === 'import' ? 'import' : 'preview'
}

function parseKind(value: string | null): ImportKind {
  if (value === 'benchmark_data' || value === 'portal_listings' || value === 'cbrs_transactions') return value
  return 'market_data'
}

function parseSourceSystem(value: string | null): SourceSystem {
  if (value === 'portal_inmobiliario' || value === 'cbrs' || value === 'client' || value === 'kml') return value
  return 'manual_import'
}

function parsePortalDatasetKind(value: string | null): PortalDatasetKind {
  if (value === 'portal_houses' || value === 'portal_projects') return value
  return 'portal_apartments'
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1
}

function summarizeRows(rows: NormalizedMarketImportRow[]) {
  return {
    rows: rows.length,
    neighborhoods: new Set(rows.map((row) => row.neighborhood)).size,
    sources: new Set(rows.map((row) => row.source)).size,
  }
}

async function readJsonBody(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return null
  return body as {
    rows?: MarketImportInputRow[]
    records?: MarketImportInputRow[]
    source?: string
    source_system?: string
    snapshot_date?: string
    observed_at?: string
    dataset_kind?: string
    full_snapshot?: boolean | string | number
    mode?: string
    kind?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireExecutiveAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
    }

    const contentType = req.headers.get('content-type') || ''
    const url = new URL(req.url)
    let mode = parseMode(url.searchParams.get('mode'))
    let kind = parseKind(url.searchParams.get('kind'))
    let sourceSystem = parseSourceSystem(url.searchParams.get('source_system'))
    let sourceLabel = 'market_intelligence_import'
    let snapshotDate = new Date().toISOString().slice(0, 10)
    let observedAt = new Date().toISOString()
    let portalDatasetKind = parsePortalDatasetKind(url.searchParams.get('dataset_kind'))
    let fullSnapshot = parseBoolean(url.searchParams.get('full_snapshot'))
    let inputRows: MarketImportInputRow[] = []
    let fileName = 'import.csv'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      const rawMode = String(formData.get('mode') || '')
      const rawKind = String(formData.get('kind') || '')
      const rawSource = String(formData.get('source') || '')
      const rawSourceSystem = String(formData.get('source_system') || '')
      const rawSnapshotDate = String(formData.get('snapshot_date') || '')
      const rawObservedAt = String(formData.get('observed_at') || '')
      const rawDatasetKind = String(formData.get('dataset_kind') || '')

      if (rawMode) mode = parseMode(rawMode)
      if (rawKind) kind = parseKind(rawKind)
      if (rawSourceSystem) sourceSystem = parseSourceSystem(rawSourceSystem)
      if (rawDatasetKind) portalDatasetKind = parsePortalDatasetKind(rawDatasetKind)
      sourceLabel = rawSource || sourceLabel
      snapshotDate = rawSnapshotDate || snapshotDate
      observedAt = rawObservedAt || observedAt
      fullSnapshot = parseBoolean(formData.get('full_snapshot'))

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Debes subir un archivo .csv, .xls o .xlsx.' }, { status: 400 })
      }

      fileName = file.name || fileName
      inputRows = parseMarketImportBuffer(Buffer.from(await file.arrayBuffer()), file.name)
    } else {
      const body = await readJsonBody(req)
      if (!body) return NextResponse.json({ error: 'Formato de solicitud no soportado.' }, { status: 400 })

      mode = parseMode(body.mode || null)
      kind = parseKind(body.kind || null)
      sourceSystem = parseSourceSystem(body.source_system || null)
      sourceLabel = body.source || sourceLabel
      snapshotDate = body.snapshot_date || snapshotDate
      observedAt = body.observed_at || observedAt
      portalDatasetKind = parsePortalDatasetKind(body.dataset_kind || null)
      fullSnapshot = parseBoolean(body.full_snapshot)
      inputRows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.records) ? body.records : []
      fileName = 'payload.json'
    }

    if (!inputRows.length) return NextResponse.json({ error: 'No encontramos filas para importar.' }, { status: 400 })

    if (kind === 'portal_listings') {
      const normalized = normalizePortalListingRows(inputRows)
      const validRows = normalized.filter((row) => row.source_listing_id)
      const skipped = normalized.length - validRows.length
      const preview = normalized.slice(0, 12)
      const summary = {
        rows: normalized.length,
        valid: validRows.length,
        skipped,
        datasetKind: portalDatasetKind,
        fullSnapshot,
      }

      if (mode === 'preview') {
        return NextResponse.json({
          kind,
          mode,
          fileName,
          source: sourceLabel,
          sourceSystem: 'portal_inmobiliario',
          observedAt,
          summary,
          preview,
          message: 'Vista previa de Portal lista. Las filas sin identificador de publicación serán rechazadas.',
        })
      }

      if (!validRows.length) {
        return NextResponse.json({ error: 'Ninguna fila de Portal contiene un identificador de publicación válido.' }, { status: 422 })
      }

      const supabase = getServiceClient()
      const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_portal_listing_snapshot', {
        p_source_label: sourceLabel,
        p_source_file: fileName,
        p_dataset_kind: portalDatasetKind,
        p_observed_at: observedAt,
        p_rows: normalized,
        p_full_snapshot: fullSnapshot,
      })
      if (pipelineError) throw pipelineError

      return NextResponse.json({
        kind,
        mode,
        fileName,
        source: sourceLabel,
        sourceSystem: 'portal_inmobiliario',
        observedAt,
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
        preview,
        message: `Portal procesado: ${Number(pipelineResult?.accepted ?? 0)} aceptadas y ${Number(pipelineResult?.rejected ?? 0)} rechazadas.`,
      })
    }

    if (kind === 'cbrs_transactions') {
      const normalized = normalizeCbrsTransactionRows(inputRows)
      const validRows = normalized.filter((row) => row.transaction_date && (row.rol || row.address) && (row.price_clp != null || row.price_uf != null))
      const skipped = normalized.length - validRows.length
      const preview = normalized.slice(0, 12)
      const summary = { rows: normalized.length, valid: validRows.length, skipped }

      if (mode === 'preview') {
        return NextResponse.json({
          kind,
          mode,
          fileName,
          source: sourceLabel,
          sourceSystem: 'cbrs',
          observedAt,
          summary,
          preview,
          message: 'Vista previa de CBRS lista. Se requiere fecha, precio y una identidad de propiedad mediante rol o dirección.',
        })
      }

      if (!validRows.length) {
        return NextResponse.json({ error: 'Ninguna fila CBRS cumple los campos mínimos: fecha, precio y rol o dirección.' }, { status: 422 })
      }

      const supabase = getServiceClient()
      const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_cbrs_transaction_snapshot', {
        p_source_label: sourceLabel,
        p_source_file: fileName,
        p_observed_at: observedAt,
        p_rows: normalized,
      })
      if (pipelineError) throw pipelineError

      return NextResponse.json({
        kind,
        mode,
        fileName,
        source: sourceLabel,
        sourceSystem: 'cbrs',
        observedAt,
        summary: {
          ...summary,
          received: Number(pipelineResult?.received ?? 0),
          accepted: Number(pipelineResult?.accepted ?? 0),
          rejected: Number(pipelineResult?.rejected ?? 0),
          inserted: Number(pipelineResult?.inserted ?? 0),
          existing: Number(pipelineResult?.existing ?? 0),
          runId: pipelineResult?.run_id ?? null,
          sourceId: pipelineResult?.source_id ?? null,
        },
        preview,
        message: `CBRS procesado: ${Number(pipelineResult?.inserted ?? 0)} compraventas nuevas y ${Number(pipelineResult?.existing ?? 0)} ya existentes.`,
      })
    }

    if (kind === 'benchmark_data') {
      const normalized = normalizeBenchmarkImportRows(inputRows, sourceLabel)
      const skipped = Math.max(0, inputRows.length - normalized.length)
      const preview = normalized.slice(0, 12)
      const benchmarkSummary = {
        rows: normalized.length,
        sources: new Set(normalized.map((row) => row.source)).size,
        neighborhoods: new Set(normalized.map((row) => row.neighborhood)).size,
        skipped,
      }
      if (mode === 'preview') {
        return NextResponse.json({ kind, mode, fileName, source: sourceLabel, sourceSystem, snapshotDate, summary: benchmarkSummary, preview, message: 'Vista previa de benchmarks lista. Confirma para guardar en external_market_benchmarks.' })
      }

      const supabase = getServiceClient()
      const { error: insertError } = await supabase.from('external_market_benchmarks').insert(
        normalized.map((row: NormalizedBenchmarkImportRow) => ({
          source: row.source,
          source_url: row.source_url,
          neighborhood: row.neighborhood,
          listing_title: row.listing_title,
          offer_count: row.offer_count,
          low_price_clp: row.low_price_clp,
          high_price_clp: row.high_price_clp,
          price_currency: row.price_currency,
          recorded_at: row.recorded_at,
        })),
      )
      if (insertError) throw insertError

      await supabase.from('data_sources').upsert(
        normalized.map((row) => ({ name: row.source, source_type: 'external_import', status: 'active', records_count: row.offer_count, last_sync: row.recorded_at, error_message: null })),
        { onConflict: 'name' },
      )

      return NextResponse.json({ kind, mode, fileName, source: sourceLabel, sourceSystem, snapshotDate, summary: { ...benchmarkSummary, imported: normalized.length }, preview, message: `Importamos ${normalized.length} filas en external_market_benchmarks.` })
    }

    const normalized = normalizeMarketImportRows(inputRows, sourceLabel, snapshotDate)
    const skipped = Math.max(0, inputRows.length - normalized.length)
    const summary = summarizeRows(normalized)
    const preview = normalized.slice(0, 12)

    if (mode === 'preview') {
      return NextResponse.json({ kind, mode, fileName, source: sourceLabel, sourceSystem, snapshotDate, summary: { ...summary, skipped }, preview, message: 'Vista previa lista. La confirmación creará ejecución, raw records, validaciones y snapshots canónicos.' })
    }

    if (!normalized.length) {
      return NextResponse.json({ error: 'Todas las filas fueron rechazadas durante la normalización.' }, { status: 422 })
    }

    const supabase = getServiceClient()
    const { data: pipelineResult, error: pipelineError } = await supabase.rpc('ingest_market_aggregate', {
      p_source_system: sourceSystem,
      p_source_label: sourceLabel,
      p_source_file: fileName,
      p_snapshot_date: snapshotDate,
      p_rows: normalized,
    })
    if (pipelineError) throw pipelineError

    return NextResponse.json({
      kind,
      mode,
      fileName,
      source: sourceLabel,
      sourceSystem,
      snapshotDate,
      summary: {
        ...summary,
        skipped,
        imported: Number(pipelineResult?.accepted ?? 0),
        rejected: Number(pipelineResult?.rejected ?? 0),
        runId: pipelineResult?.run_id ?? null,
        sourceId: pipelineResult?.source_id ?? null,
      },
      preview,
      message: `Pipeline completado: ${Number(pipelineResult?.accepted ?? 0)} filas aceptadas y ${Number(pipelineResult?.rejected ?? 0)} rechazadas.`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos procesar la importación de mercado.' },
      { status: 500 },
    )
  }
}
