import marketSourceData from '@/data/market-source-intelligence.json'
import {
  normalizeMarketRecord,
  type CanonicalMarketProperty,
  type MarketSourceDescriptor,
  type MarketSourceRole,
  type RawMarketRecord,
} from '@/lib/market-intelligence-engine'

export type ScraperDatasetKind = 'portal_apartments' | 'portal_houses' | 'portal_projects' | 'registered_sales'

export type ScraperDatasetConnection = {
  id: ScraperDatasetKind
  sourceSystem: 'Portal Inmobiliario scraper' | 'CBRS import'
  file: string
  role: MarketSourceRole
  sha256: string | null
  bytes: number | null
  expectedRows: number | null
  generatedAt: string | null
  connected: boolean
  connectionMode: 'build_artifact'
  canonicalIngestionReady: boolean
  issues: string[]
}

export type ScraperConnectionStatus = {
  generatedAt: string | null
  connected: boolean
  portalRows: number
  registeredSalesRows: number
  datasets: ScraperDatasetConnection[]
  issues: string[]
  methodology: string
}

type MarketSourcePayload = {
  generatedAt?: string
  sourceInventory?: {
    files?: Array<{
      file?: string
      role?: string
      sha256?: string
      bytes?: number
    }>
  }
  cross?: {
    portal?: Array<{
      file?: string
      rows?: number
      listingIds?: { present?: number }
    }>
    cbrs?: { rows?: number }
  }
}

const data = marketSourceData as unknown as MarketSourcePayload

function sourceRole(value: string | undefined): MarketSourceRole {
  if (value === 'published_offer' || value === 'registered_sales' || value === 'neighborhood_geometry') return value
  return 'unknown'
}

function datasetKind(file: string, role: MarketSourceRole): ScraperDatasetKind | null {
  const normalized = file.toLowerCase()
  if (role === 'registered_sales') return 'registered_sales'
  if (normalized.includes('depto')) return 'portal_apartments'
  if (normalized.includes('casa')) return 'portal_houses'
  if (normalized.includes('proyecto')) return 'portal_projects'
  return null
}

function expectedRows(file: string, kind: ScraperDatasetKind) {
  if (kind === 'registered_sales') return data.cross?.cbrs?.rows ?? null
  const portal = data.cross?.portal ?? []
  const match = portal.find((item) => item.file === file || file.includes(item.file ?? ''))
  return match?.listingIds?.present ?? match?.rows ?? null
}

export function getScraperConnectionStatus(): ScraperConnectionStatus {
  const files = data.sourceInventory?.files ?? []
  const datasets = files
    .map((file): ScraperDatasetConnection | null => {
      const role = sourceRole(file.role)
      const fileName = file.file ?? 'unknown'
      const kind = datasetKind(fileName, role)
      if (!kind) return null

      const rows = expectedRows(fileName, kind)
      const issues: string[] = []
      if (!file.sha256) issues.push('missing_source_hash')
      if (!file.bytes) issues.push('missing_source_size')
      if (rows === null) issues.push('missing_row_count')

      return {
        id: kind,
        sourceSystem: kind === 'registered_sales' ? 'CBRS import' : 'Portal Inmobiliario scraper',
        file: fileName,
        role,
        sha256: file.sha256 ?? null,
        bytes: file.bytes ?? null,
        expectedRows: rows,
        generatedAt: data.generatedAt ?? null,
        connected: issues.length === 0,
        connectionMode: 'build_artifact',
        canonicalIngestionReady: role === 'published_offer' || role === 'registered_sales',
        issues,
      }
    })
    .filter((item): item is ScraperDatasetConnection => item !== null)

  const portalRows = datasets
    .filter((dataset) => dataset.sourceSystem === 'Portal Inmobiliario scraper')
    .reduce((sum, dataset) => sum + (dataset.expectedRows ?? 0), 0)
  const registeredSalesRows = datasets
    .filter((dataset) => dataset.sourceSystem === 'CBRS import')
    .reduce((sum, dataset) => sum + (dataset.expectedRows ?? 0), 0)

  const issues = datasets.flatMap((dataset) => dataset.issues.map((issue) => `${dataset.id}:${issue}`))
  if (!datasets.some((dataset) => dataset.id === 'portal_apartments')) issues.push('missing_portal_apartments_dataset')
  if (!datasets.some((dataset) => dataset.id === 'portal_houses')) issues.push('missing_portal_houses_dataset')
  if (!datasets.some((dataset) => dataset.id === 'portal_projects')) issues.push('missing_portal_projects_dataset')
  if (!datasets.some((dataset) => dataset.id === 'registered_sales')) issues.push('missing_registered_sales_dataset')

  return {
    generatedAt: data.generatedAt ?? null,
    connected: issues.length === 0,
    portalRows,
    registeredSalesRows,
    datasets,
    issues,
    methodology: 'The market engine is connected to immutable scraper/import build artifacts through file identity, SHA-256, byte size and expected row counts. Runtime intelligence must reject a dataset when lineage validation fails. This confirms artifact-level connection, not a live network connection to the scraper process.',
  }
}

export function ingestScraperRows(
  dataset: ScraperDatasetKind,
  rows: RawMarketRecord[],
): CanonicalMarketProperty[] {
  const status = getScraperConnectionStatus()
  const connection = status.datasets.find((item) => item.id === dataset)
  if (!connection || !connection.connected) {
    throw new Error(`Scraper dataset ${dataset} is not connected or failed lineage validation.`)
  }

  if (connection.expectedRows !== null && rows.length !== connection.expectedRows) {
    throw new Error(`Row count mismatch for ${dataset}: expected ${connection.expectedRows}, received ${rows.length}.`)
  }

  const source: Pick<MarketSourceDescriptor, 'file' | 'role'> = {
    file: connection.file,
    role: connection.role,
  }

  return rows.map((row) => normalizeMarketRecord(row, source))
}
