import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireCapability, accessErrorResponse } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { loadPedroMarketOverview, type PedroMarketOverview } from '@/lib/market-pedro-overview'

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
  // Read-only privileged access after requireCapability('market.read') in GET.
  // Restrict to the two approved public Portal sources, never tenant CRM data.
  const supabase = createServiceClient()
  const sources = await supabase.from('market_sources').select('id').in('code', [
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
  ]).limit(2)
  if (sources.error) throw sources.error
  const ids = (sources.data ?? []).map((source) => source.id)
  const rows: ExportRow[] = []
  if (!ids.length) return { rows, truncated: false }
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('market_current_listings')
      .select('source_listing_id,property_id,operation,status,url,title,raw_address,normalized_address,latitude,longitude,price_clp,price_uf,price_uf_m2,published_at,observed_at,removed_at')
      .in('source_id', ids)
      .eq('status', 'active')
      .is('removed_at', null)
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

function summaryRows(snapshot: PedroMarketOverview): ExportRow[] {
  const records: ExportRow[] = []
  for (const category of snapshot.categories) {
    records.push({
      source: 'Portal Inmobiliario',
      property_type: category.name,
      period: 'último inventario completo',
      metric: 'inventory_verified',
      value: category.group?.inventoryCount ?? null,
      last_verified_at: category.group?.inventoryAt ?? null,
      methodology: 'Recuento del último recorrido completo, sin extrapolar deltas',
    })
    records.push({
      source: 'Portal Inmobiliario',
      property_type: category.name,
      period: snapshot.day,
      metric: 'first_seen_today',
      value: category.group?.addedTodayCount ?? null,
      last_verified_at: category.daily.updatedAt,
      methodology: 'Primera aparición de ID de fuente, no reobservaciones',
    })
  }
  for (const year of snapshot.cbrsHistory) {
    records.push({
      source: 'CBRS Vitacura',
      property_type: year.propertyType,
      period: String(year.year),
      metric: 'registered_residential_sales',
      value: year.transactions,
      median_price_uf: year.medianPriceUf,
      median_price_uf_m2: year.medianUfM2,
      methodology: 'Evento único de compraventa residencial por inscripción canónica',
    })
  }
  return records
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
    const snapshot = await loadPedroMarketOverview()
    const observedThrough = snapshot.categories
      .flatMap((category) => [category.daily.updatedAt, category.group?.inventoryAt])
      .filter((value): value is string => Boolean(value))
      .sort().at(-1) ?? null

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
      observed_through: observedThrough,
      latest_period: String(snapshot.lastCompleteYear),
      freshness_status: snapshot.categories.every((category) => category.daily.current) ? 'daily_updated' : 'daily_pending',
      source_scope: 'Authorized read-only Vitacura Portal listings and verified annual CBRS metrics',
      methodology: 'Canonical Portal full inventory and first-seen deltas are distinct; CBRS annual residential events are independently verified',
      row_count: rows.length,
      truncated,
      max_rows: MAX_ROWS,
    }
    const enrichedRows = rows.map((row) => ({
      export_generated_at: generatedAt,
      export_observed_through: observedThrough,
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
