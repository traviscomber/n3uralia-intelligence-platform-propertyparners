import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'
import { persistNeighborhoodMarketSnapshot } from '@/lib/market-history'
import { requireExecutiveAccess } from '@/lib/api-access'
import {
  normalizeBenchmarkImportRows,
  normalizeMarketImportRows,
  parseMarketImportBuffer,
  type MarketImportInputRow,
  type NormalizedBenchmarkImportRow,
  type NormalizedMarketImportRow,
} from '@/lib/market-import'

export const dynamic = 'force-dynamic'

type ImportMode = 'preview' | 'import'
type ImportKind = 'market_data' | 'benchmark_data'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function parseMode(value: string | null): ImportMode {
  return value === 'import' ? 'import' : 'preview'
}

function parseKind(value: string | null): ImportKind {
  return value === 'benchmark_data' ? 'benchmark_data' : 'market_data'
}

function summarizeRows(rows: NormalizedMarketImportRow[]) {
  const neighborhoods = new Set(rows.map((row) => row.neighborhood))
  const sources = new Set(rows.map((row) => row.source))
  return {
    rows: rows.length,
    neighborhoods: neighborhoods.size,
    sources: sources.size,
  }
}

async function readJsonBody(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return null
  return body as { rows?: MarketImportInputRow[]; records?: MarketImportInputRow[]; source?: string; snapshot_date?: string; mode?: string; kind?: string }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireExecutiveAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
    }
    const contentType = req.headers.get('content-type') || ''
    const url = new URL(req.url)
    const queryMode = parseMode(url.searchParams.get('mode'))
    const queryKind = parseKind(url.searchParams.get('kind'))
    let mode = queryMode
    let kind = queryKind
    let sourceLabel = 'market_intelligence_import'
    let snapshotDate = new Date().toISOString().slice(0, 10)
    let inputRows: MarketImportInputRow[] = []
    let fileName = 'import.csv'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      const rawMode = String(formData.get('mode') || '')
      const rawKind = String(formData.get('kind') || '')
      const rawSource = String(formData.get('source') || '')
      const rawSnapshotDate = String(formData.get('snapshot_date') || '')

      if (rawMode) {
        mode = parseMode(rawMode)
      }
      if (rawKind) {
        kind = parseKind(rawKind)
      }
      sourceLabel = rawSource || sourceLabel
      snapshotDate = rawSnapshotDate || snapshotDate

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Debes subir un archivo .csv, .xls o .xlsx.' }, { status: 400 })
      }

      fileName = file.name || fileName
      const buffer = Buffer.from(await file.arrayBuffer())
      inputRows = parseMarketImportBuffer(buffer, file.name)
    } else {
      const body = await readJsonBody(req)
      if (!body) {
        return NextResponse.json({ error: 'Formato de solicitud no soportado.' }, { status: 400 })
      }

      mode = parseMode(body.mode || null)
      kind = parseKind(body.kind || null)
      sourceLabel = body.source || sourceLabel
      snapshotDate = body.snapshot_date || snapshotDate
      inputRows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.records) ? body.records : []
      fileName = 'payload.json'
    }

    if (!inputRows.length) {
      return NextResponse.json({ error: 'No encontramos filas para importar.' }, { status: 400 })
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
        return NextResponse.json({
          kind,
          mode,
          fileName,
          source: sourceLabel,
          snapshotDate,
          summary: benchmarkSummary,
          preview,
          message: 'Vista previa de benchmarks lista. Confirma para guardar en external_market_benchmarks.',
        })
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
        normalized.map((row) => ({
          name: row.source,
          source_type: 'external_import',
          status: 'active',
          records_count: row.offer_count,
          last_sync: row.recorded_at,
          error_message: null,
        })),
        { onConflict: 'name' },
      )

      return NextResponse.json({
        kind,
        mode,
        fileName,
        source: sourceLabel,
        snapshotDate,
        summary: {
          ...benchmarkSummary,
          imported: normalized.length,
        },
        preview,
        message: `Importamos ${normalized.length} filas en external_market_benchmarks.`,
      })
    }

    const normalized = normalizeMarketImportRows(inputRows, sourceLabel)
    const skipped = Math.max(0, inputRows.length - normalized.length)
    const summary = summarizeRows(normalized)
    const preview = normalized.slice(0, 12)

    if (mode === 'preview') {
      return NextResponse.json({
        kind,
        mode,
        fileName,
        source: sourceLabel,
        snapshotDate,
        summary: {
          ...summary,
          skipped,
        },
        preview,
        message: 'Vista previa lista. Confirma para importar a market_data y neighborhood_market_data.',
      })
    }

    const supabase = getServiceClient()
    const marketRows = normalized.map((row) => ({
      neighborhood: row.neighborhood,
      avg_price_uf: row.avg_price_uf,
      avg_price_m2_uf: row.avg_price_m2_uf,
      absorption_rate: row.absorption_rate,
      inventory_count: row.inventory_count,
      avg_days_on_market: row.avg_days_on_market,
    }))

    const { error: marketError } = await supabase
      .from('market_data')
      .upsert(marketRows, { onConflict: 'neighborhood' })

    if (marketError) throw marketError

    const snapshotRows = await persistNeighborhoodMarketSnapshot(
      supabase,
      normalized.map((row) => ({
        neighborhood: row.neighborhood,
        avg_price_uf: row.avg_price_uf,
        avg_price_m2_uf: row.avg_price_m2_uf,
        absorption_rate: row.absorption_rate,
        inventory_count: row.inventory_count,
        avg_days_on_market: row.avg_days_on_market,
      })),
    )

    return NextResponse.json({
      kind,
      mode,
      fileName,
      source: sourceLabel,
      snapshotDate,
      summary: {
        ...summary,
        skipped,
        imported: normalized.length,
        snapshotRows: snapshotRows.length,
      },
      preview,
      message: `Importamos ${normalized.length} filas y actualizamos la capa de Market Intelligence.`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos procesar la importacion de mercado.' },
      { status: 500 },
    )
  }
}
