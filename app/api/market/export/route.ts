import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireCapability, accessErrorResponse } from '@/lib/access-guards'
import { getMarketHouseIntelligence } from '@/lib/market-house-intelligence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ExportDataset = 'summary' | 'neighborhoods'
type ExportFormat = 'csv' | 'xlsx'
type ExportRow = Record<string, string | number | boolean | null>

function parseDataset(value: string | null): ExportDataset {
  return value === 'neighborhoods' ? 'neighborhoods' : 'summary'
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

function summaryRows(summary: Awaited<ReturnType<typeof getMarketHouseIntelligence>>['summary']): ExportRow[] {
  return [
    { metric: 'portal_active_houses', label: 'Casas activas', value: summary.portalActiveHouses, source: 'Portal Inmobiliario', cutoff: summary.portalAsOf, methodology: 'Último estado observado; operación venta; tipo casa.' },
    { metric: 'portal_median_price_uf', label: 'Mediana oferta UF', value: summary.portalMedianPriceUf, source: 'Portal Inmobiliario', cutoff: summary.portalAsOf, methodology: 'Mediana de precios UF positivos del corte.' },
    { metric: 'portal_median_uf_m2', label: 'Mediana oferta UF/m²', value: summary.portalMedianUfM2, source: 'Portal Inmobiliario', cutoff: summary.portalAsOf, methodology: 'Mediana de UF/m² positivos del corte.' },
    { metric: 'cbrs_house_transactions', label: 'Ventas registradas', value: summary.cbrsHouseTransactions, source: 'CBRS', cutoff: summary.cbrsAsOf, methodology: 'Transacciones canónicas clasificadas como casa.' },
    { metric: 'cbrs_house_with_neighborhood', label: 'Ventas con barrio', value: summary.cbrsHouseWithNeighborhood, source: 'CBRS + KML Property Partners', cutoff: summary.cbrsAsOf, methodology: 'Transacciones de casas con barrio canónico no vacío.' },
    { metric: 'canonical_houses', label: 'Casas canónicas', value: summary.canonicalHouses, source: 'Property Partners', cutoff: summary.referenceAsOf, methodology: 'Identidades canónicas clasificadas como casa.' },
    { metric: 'exact_kml_houses', label: 'Casas con KML exacto', value: summary.exactKmlHouses, source: 'KML Property Partners', cutoff: summary.referenceAsOf, methodology: 'Barrio asignado desde el KML aceptado.' },
    { metric: 'review_houses', label: 'Casas por revisar', value: summary.reviewHouses, source: 'Property Partners', cutoff: summary.referenceAsOf, methodology: 'Casas sin asignación exacta desde el KML aceptado.' },
    { metric: 'portal_exact_kml_houses', label: 'Oferta actual con KML exacto', value: summary.portalExactKmlHouses, source: 'Portal + KML Property Partners', cutoff: summary.portalAsOf, methodology: 'Avisos actuales vinculados a una casa con barrio KML exacto.' },
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
    const intelligence = await getMarketHouseIntelligence()

    if (intelligence.error) {
      console.error('MARKET_HOUSE_EXPORT_UNAVAILABLE')
      return NextResponse.json({ error: 'La inteligencia de casas no está disponible.' }, { status: 503 })
    }

    const rows: ExportRow[] = dataset === 'neighborhoods'
      ? intelligence.neighborhoods.map((row) => ({
          barrio: row.neighborhoodName,
          ventas_cbrs: row.cbrsTransactions,
          mediana_uf: row.cbrsMedianPriceUf,
          mediana_uf_m2_construido: row.cbrsMedianUfM2,
          corte_cbrs: row.cbrsAsOf,
        }))
      : summaryRows(intelligence.summary)

    const metadata = {
      dataset,
      property_type: 'Casa',
      operation: 'Venta',
      commune: 'Vitacura',
      generated_at: generatedAt,
      portal_cutoff: intelligence.summary.portalAsOf,
      cbrs_cutoff: intelligence.summary.cbrsAsOf,
      source_scope: 'Portal Inmobiliario, CBRS y KML Property Partners',
      methodology: 'Sin imputaciones. La oferta y las ventas históricas conservan fuentes y cortes separados.',
      row_count: rows.length,
    }
    const enrichedRows = rows.map((row) => ({ export_generated_at: generatedAt, ...row }))
    const filename = `property_partners_casas_vitacura_${dataset}_${generatedAt.slice(0, 10)}.${format}`

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadataRows(metadata)), 'Metodología')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(enrichedRows), dataset === 'summary' ? 'Resumen' : 'Barrios')
      const binary = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return new Response(binary, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return new Response(toCsv(enrichedRows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown'
    console.error('MARKET_HOUSE_EXPORT_FAILED', { code })
    return NextResponse.json({ error: 'No fue posible generar la exportación.' }, { status: 500 })
  }
}
