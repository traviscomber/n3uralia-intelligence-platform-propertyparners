import { Buffer } from 'node:buffer'
import * as XLSX from 'xlsx'

export type MarketImportInputRow = Record<string, unknown>

export type NormalizedMarketImportRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  source: string
  source_url: string | null
  recorded_at: string
  snapshot_date: string
}

export type NormalizedBenchmarkImportRow = {
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string
  recorded_at: string
}

const FIELD_ALIASES: Record<keyof Omit<NormalizedMarketImportRow, 'inventory_count' | 'source_url' | 'recorded_at' | 'snapshot_date'> | 'inventory_count' | 'source_url' | 'recorded_at' | 'snapshot_date', string[]> = {
  neighborhood: ['neighborhood', 'barrio', 'barrio_nombre', 'name', 'sector_name', 'zona'],
  avg_price_uf: ['avg_price_uf', 'price_uf', 'precio_uf', 'precio_promedio_uf', 'average_price_uf'],
  avg_price_m2_uf: ['avg_price_m2_uf', 'price_per_sqm_uf', 'precio_m2_uf', 'price_m2_uf', 'precio_por_m2_uf'],
  absorption_rate: ['absorption_rate', 'tasa_absorcion', 'absorcion', 'absorption', 'absorption_pct'],
  inventory_count: ['inventory_count', 'stock', 'inventario', 'inventory', 'ofertas', 'offers'],
  avg_days_on_market: ['avg_days_on_market', 'days_on_market', 'dias_en_mercado', 'velocidad_venta', 'velocity_days'],
  source: ['source', 'fuente', 'origin', 'pipeline_source'],
  source_url: ['source_url', 'url', 'source_link', 'link', 'sourceuri'],
  recorded_at: ['recorded_at', 'recorded', 'fecha_registro', 'timestamp', 'created_at'],
  snapshot_date: ['snapshot_date', 'fecha', 'periodo', 'period_date', 'date'],
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function pickValue(row: MarketImportInputRow, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeKey(key)
    if (aliases.some((alias) => normalizeKey(alias) === normalizedKey)) {
      return value
    }
  }
  return undefined
}

function toStringValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value).trim()
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const text = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/UF/gi, '')
    .replace(/CLP/gi, '')

  if (!text) return null

  const normalized = text.includes(',') && text.includes('.')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(',', '.')

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toRate(value: unknown): number | null {
  const parsed = toNumber(value)
  if (parsed == null) return null
  if (parsed > 1) return Number((parsed / 100).toFixed(4))
  return Number(parsed.toFixed(4))
}

function toIsoDate(value: unknown, fallback = new Date()) {
  if (value == null || value === '') {
    return fallback.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const iso = new Date(Date.UTC(date.y, date.m - 1, date.d))
      return iso.toISOString().slice(0, 10)
    }
  }

  const text = String(value).trim()
  if (!text) return fallback.toISOString().slice(0, 10)

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  const parts = text.split(/[\/.-]/).map((part) => Number.parseInt(part, 10))
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [a, b, c] = parts
    const year = a > 31 ? a : c > 31 ? c : fallback.getUTCFullYear()
    const month = a > 12 ? b : a
    const day = a > 12 ? c : b
    const iso = new Date(Date.UTC(year, (month || 1) - 1, day || 1))
    if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10)
  }

  return fallback.toISOString().slice(0, 10)
}

function toIsoDateTime(value: unknown, fallback = new Date()) {
  if (value == null || value === '') return fallback.toISOString()

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return new Date(Date.UTC(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0)).toISOString()
    }
  }

  const text = String(value).trim()
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()

  return fallback.toISOString()
}

export function normalizeMarketImportRows(
  rows: MarketImportInputRow[],
  fallbackSource = 'market_intelligence_import',
  fallbackSnapshotDate?: string,
) {
  const now = new Date()
  const requestedSnapshotDate = fallbackSnapshotDate
    ? new Date(`${fallbackSnapshotDate}T00:00:00.000Z`)
    : now
  const snapshotFallback = Number.isNaN(requestedSnapshotDate.getTime()) ? now : requestedSnapshotDate

  const normalized = rows
    .map((row) => {
      const neighborhood = toStringValue(pickValue(row, FIELD_ALIASES.neighborhood))
      if (!neighborhood) return null

      const source = toStringValue(pickValue(row, FIELD_ALIASES.source)) || fallbackSource

      return {
        neighborhood,
        avg_price_uf: toNumber(pickValue(row, FIELD_ALIASES.avg_price_uf)),
        avg_price_m2_uf: toNumber(pickValue(row, FIELD_ALIASES.avg_price_m2_uf)),
        absorption_rate: toRate(pickValue(row, FIELD_ALIASES.absorption_rate)),
        inventory_count: Math.max(0, Math.round(toNumber(pickValue(row, FIELD_ALIASES.inventory_count)) ?? 0)),
        avg_days_on_market: toNumber(pickValue(row, FIELD_ALIASES.avg_days_on_market)),
        source,
        source_url: toStringValue(pickValue(row, FIELD_ALIASES.source_url)) || null,
        recorded_at: toIsoDateTime(pickValue(row, FIELD_ALIASES.recorded_at), now),
        snapshot_date: toIsoDate(pickValue(row, FIELD_ALIASES.snapshot_date), snapshotFallback),
      } satisfies NormalizedMarketImportRow
    })
    .filter((row): row is NormalizedMarketImportRow => Boolean(row))

  return normalized
}

export function parseMarketImportBuffer(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase()
  const workbook = lower.endsWith('.csv')
    ? XLSX.read(buffer.toString('utf8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer' })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return []
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<MarketImportInputRow>(sheet, {
    defval: '',
    raw: true,
    blankrows: false,
  })

  return rows
}

export const MARKET_IMPORT_TEMPLATE_HEADERS = [
  'neighborhood',
  'avg_price_uf',
  'avg_price_m2_uf',
  'absorption_rate',
  'inventory_count',
  'avg_days_on_market',
  'source',
  'source_url',
  'recorded_at',
  'snapshot_date',
] as const

export function normalizeBenchmarkImportRows(rows: MarketImportInputRow[], fallbackSource = 'market_intelligence_import') {
  const now = new Date()

  return rows
    .map((row) => {
      const source = toStringValue(pickValue(row, ['source', 'fuente', 'origin'])) || fallbackSource
      const sourceUrl = toStringValue(pickValue(row, ['source_url', 'url', 'source_link', 'link']))
      const neighborhood = toStringValue(pickValue(row, ['neighborhood', 'barrio', 'barrio_nombre', 'zona']))
      const listingTitle = toStringValue(pickValue(row, ['listing_title', 'title', 'titulo', 'name'])) || null
      const offerCount = Math.max(0, Math.round(toNumber(pickValue(row, ['offer_count', 'offers', 'ofertas', 'count'])) ?? 0))
      const lowPrice = toNumber(pickValue(row, ['low_price_clp', 'min_price_clp', 'precio_min_clp', 'price_low_clp']))
      const highPrice = toNumber(pickValue(row, ['high_price_clp', 'max_price_clp', 'precio_max_clp', 'price_high_clp']))
      const currency = toStringValue(pickValue(row, ['price_currency', 'currency', 'moneda'])) || 'CLP'
      const recordedAt = toIsoDateTime(pickValue(row, ['recorded_at', 'recorded', 'fecha_registro', 'timestamp']), now)

      if (!source || !sourceUrl || !neighborhood) return null

      return {
        source,
        source_url: sourceUrl,
        neighborhood,
        listing_title: listingTitle,
        offer_count: offerCount,
        low_price_clp: lowPrice,
        high_price_clp: highPrice,
        price_currency: currency,
        recorded_at: recordedAt,
      } satisfies NormalizedBenchmarkImportRow
    })
    .filter((row): row is NormalizedBenchmarkImportRow => Boolean(row))
}

export const BENCHMARK_IMPORT_TEMPLATE_HEADERS = [
  'source',
  'source_url',
  'neighborhood',
  'listing_title',
  'offer_count',
  'low_price_clp',
  'high_price_clp',
  'price_currency',
  'recorded_at',
] as const
