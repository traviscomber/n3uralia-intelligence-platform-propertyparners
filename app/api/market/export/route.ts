import { buildMarketContractSnapshot } from '@/lib/market-contract'

function csvCell(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

export async function GET() {
  const snapshot = buildMarketContractSnapshot()
  const rows: Array<Array<string | number | null | undefined>> = [
    ['seccion', 'indicador', 'valor', 'unidad', 'estado', 'fuente', 'periodo', 'metodologia', 'limitacion'],
    ...snapshot.metrics.map((metric) => [
      'indicadores',
      metric.label,
      metric.value,
      metric.unit,
      metric.status,
      metric.source,
      metric.period,
      metric.methodology,
      metric.limitation,
    ]),
    ...snapshot.neighborhoods.map((row) => [
      'barrios',
      row.neighborhood,
      row.publishedListings,
      'publicaciones',
      'available',
      'Portal Inmobiliario + KML',
      'Snapshot entregado por el cliente',
      'Publicaciones con coordenadas asignadas al polígono.',
      'No equivale a propiedades canónicas ni inventario activo.',
    ]),
    ...snapshot.neighborhoods.map((row) => [
      'barrios',
      row.neighborhood,
      row.registeredSales,
      'registros',
      'available',
      'CBRS',
      '2014 al 9 de enero de 2026',
      'Filas registrales agrupadas por barrio asignado.',
      'No equivale a ventas únicas de propiedades canónicas.',
    ]),
  ]

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}\n`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inteligencia-mercado-vitacura.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
