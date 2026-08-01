export const marketSourceSystems = ['portal_inmobiliario', 'cbrs', 'client', 'kml', 'manual_import'] as const
export const marketDatasetKinds = ['portal_apartments', 'portal_houses', 'portal_projects', 'registered_sales', 'client_sales', 'kml_neighborhoods'] as const

export type MarketSourceSystem = typeof marketSourceSystems[number]
export type MarketDatasetKind = typeof marketDatasetKinds[number]
export type MarketContractRow = Record<string, unknown>

const clean = (value: unknown) => value == null ? '' : String(value).trim()
const numeric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isSourceDatasetCompatible(sourceSystem: MarketSourceSystem, datasetKind: MarketDatasetKind) {
  if (sourceSystem === 'manual_import') return true
  if (sourceSystem === 'portal_inmobiliario') return datasetKind.startsWith('portal_')
  if (sourceSystem === 'cbrs') return datasetKind === 'registered_sales'
  if (sourceSystem === 'client') return datasetKind === 'client_sales'
  if (sourceSystem === 'kml') return datasetKind === 'kml_neighborhoods'
  return false
}

export function validateMarketContractRow(row: MarketContractRow, datasetKind: MarketDatasetKind) {
  const errors: string[] = []

  if (datasetKind.startsWith('portal_')) {
    if (!clean(row.source_record_id || row.listing_id || row.id)) errors.push('source_record_id requerido')
    return errors
  }

  if (datasetKind === 'kml_neighborhoods') {
    if (!clean(row.name || row.neighborhood || row.barrio)) errors.push('name requerido')
    if (!row.geometry || typeof row.geometry !== 'object' || Array.isArray(row.geometry)) errors.push('geometry GeoJSON requerida')
    return errors
  }

  const eventKey = clean(row.event_key || row.source_record_id || row.id)
  const transactionDate = clean(row.transaction_date || row.fecha)
  const rol = clean(row.rol)
  const address = clean(row.normalized_address || row.address || row.direccion)
  const priceUf = numeric(row.price_uf || row.precio_uf)
  const priceClp = numeric(row.price_clp || row.precio_clp)

  if (!eventKey) errors.push('event_key requerido')
  if (!transactionDate) errors.push('transaction_date requerida')
  else if (Number.isNaN(Date.parse(transactionDate))) errors.push('transaction_date inválida')
  if (!rol && !address) errors.push('rol o dirección requerido para identificar el activo')
  if ((priceUf == null || priceUf <= 0) && (priceClp == null || priceClp <= 0)) {
    errors.push('precio positivo en UF o CLP requerido')
  }

  return errors
}
