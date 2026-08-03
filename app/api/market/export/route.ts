import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireCapability, accessErrorResponse } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { getOperationalMarketSnapshot } from '@/lib/market-operational'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 1000
const MAX_ROWS = 25000

type ExportDataset = 'summary' | 'listings' | 'transactions'
type ExportFormat = 'csv' | 'xlsx'
type ExportRow = Record<string, string | number | boolean | null>

function parseDataset(value: string | null): ExportDataset {
  if (value === 'listings' || value === 'transactions') return value
  return 'summary'
}

function parseFormat(value: string | null): ExportFormat {
  return value === 'xlsx' ? 'xlsx' : 'csv'
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function toCsv(rows: ExportRow[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(','))
  return `\uFEFF${lines.join('\n')}`
}

function metadataRows(metadata: Record<string, string | number | boolean | null>): ExportRow[] {
  return Object.entries(metadata).map(([field, value]) => ({ field, value }))
}

async function fetchListings() {
  const supabase = await createClient()
  const rows: ExportRow[] = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('market_current_listings')
      .select('source_listing_id,property_id,operation,status,url,title,raw_address,normalized_address,latitude,longitude,price_clp,price_uf,price_uf_m2,published_at,observed_at,removed_at')
      .order('observed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as ExportRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return { rows, truncated: rows.length >= MAX_ROWS }
}

async function fetchTransactions() {
  const supabase = await createClient()
  const rows: ExportRow[] = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('market_transactions')
      .select('event_key,property_id,rol,transaction_date,price_clp,price_uf,price_uf_m2,description,tomo,foja,numero,created_at')
      .order('transaction_date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as ExportRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return { rows, truncated: rows.length >= MAX_ROWS }
}

function summaryRows(snapshot: Awaited<ReturnType<typeof getOperationalMarketSnapshot>>): ExportRow[] {
  return [
    { metric: 'canonical_properties', label: 'Registros canónicos candidatos', value: snapshot.canonicalProperties, methodology: 'Conteo de market_properties visibles por RLS' },
    { metric: 'confirmed_properties', label: 'Identidades confirmadas', value: snapshot.confirmedProperties, methodology: 'identity_status = confirmed' },
    { metric: 'active_inventory', label: 'Publicaciones activas del último corte', value: snapshot.activeInventory, methodology: 'Snapshot canónico o publicaciones activas observadas' },
    { metric: 'confirmed_sales', label: 'Ventas confirmadas', value: snapshot.confirmedSales, methodology: 'Transacciones persistidas y vinculadas' },
    { metric: 'pending_matches', label: 'Señales pendientes de revisión', value: snapshot.pendingMatches, methodology: 'Identidades y coincidencias candidatas; no necesariamente propiedades únicas' },
    { metric: 'missing_neighborhoods', label: 'Registros sin barrio', value: snapshot.missingNeighborhoods, methodology: 'Propiedades sin neighborhood_id' },
    { metric: 'median_days_on_market', label: 'Mediana de días en mercado', value: snapshot.medianDaysOnMarket, methodology: 'No se calcula sin ventas confirmadas vinculadas' },
    { metric: 'absorption_rate', label: 'Tasa de absorción', value: snapshot.absorptionRate, methodology: 'Inventario y ventas del mismo período' },
    { metric: 'offer_to_sales_ratio', label: 'Oferta versus ventas', value: snapshot.offerToSalesRatio, methodology: 'Relación materializada en snapshot canónico' },
    { metric: 'ingestion_runs', label: 'Ejecuciones registradas', value: snapshot.ingestionRuns, methodology: 'Backfills e importaciones canónicas almacenadas' },
  ]
}

export async function GET(request: NextRequest) {
  try {
    await requireCapability('market.read')
  } catch (error) {
    return accessErrorResponse(error)
  }

  try {
    const dataset = parseDataset(request.nextUrl.searchParams.get('dataset'))
    const format = parseFormat(request.nextUrl.searchParams.get('format'))
    const generatedAt = new Date().toISOString()
    const snapshot = await getOperationalMarketSnapshot()
    if (snapshot.error) {
      console.error('MARKET_EXPORT_SNAPSHOT_UNAVAILABLE')
      return NextResponse.json({ error: 'Los datos de mercado no están disponibles para exportación.' }, { status: 503 })
    }

    let rows: ExportRow[]
    let truncated = false
    if (dataset === 'listings') {
      const result = await fetchListings()
      rows = result.rows
      truncated = result.truncated
    } else if (dataset === 'transactions') {
      const result = await fetchTransactions()
      rows = result.rows
      truncated = result.truncated
    } else {
      rows = summaryRows(snapshot)
    }

    const metadata = {
      dataset,
      generated_at: generatedAt,
      observed_through: snapshot.latestObservedAt,
      latest_period: snapshot.latestPeriod,
      freshness_status: snapshot.freshnessStatus,
      observation_age_days: snapshot.observationAgeDays,
      source_scope: 'Supabase operational records visible to the authenticated role through RLS',
      methodology: 'Export uses the same operational sources as /dashboard/market and does not impute missing values',
      row_count: rows.length,
      truncated,
      max_rows: MAX_ROWS,
    }
    const enrichedRows = rows.map((row) => ({
      export_generated_at: generatedAt,
      export_observed_through: snapshot.latestObservedAt,
      export_dataset: dataset,
      ...row,
    }))
    const date = generatedAt.slice(0, 10)
    const filename = `property_partners_market_${dataset}_${date}.${format}`

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadataRows(metadata)), 'Metadata')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(enrichedRows.length ? enrichedRows : [{ status: 'Sin datos operativos' }]), dataset)
      const binary = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return new Response(binary, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Export-Truncated': String(truncated),
        },
      })
    }

    return new Response(toCsv(enrichedRows.length ? enrichedRows : [{ status: 'Sin datos operativos' }]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Export-Truncated': String(truncated),
      },
    })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown'
    console.error('MARKET_EXPORT_FAILED', { code })
    return NextResponse.json({ error: 'No fue posible generar la exportación.' }, { status: 500 })
  }
}
