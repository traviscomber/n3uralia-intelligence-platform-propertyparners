import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'

export type ContractMetricStatus = 'available' | 'partial' | 'pending_source'

export type ContractMetric = {
  key: string
  label: string
  value: number | null
  unit?: string
  status: ContractMetricStatus
  source: string
  period: string
  methodology: string
  limitation?: string
}

export type NeighborhoodMarketRow = {
  neighborhood: string
  publishedListings: number
  registeredSales: number
}

function sumPortalRows() {
  return market.cross.portal.reduce((sum, file) => sum + file.rows, 0)
}

function sumPortalField(field: 'both_missing') {
  return market.cross.portal.reduce((sum, file) => sum + Number(file.coordinateQuality[field] || 0), 0)
}

function sumOperationIndicator(field: 'no_explicit_indicator') {
  return market.cross.portal.reduce((sum, file) => sum + Number(file.operationIndicators[field] || 0), 0)
}

function buildNeighborhoodRows(): NeighborhoodMarketRow[] {
  const rows = new Map<string, NeighborhoodMarketRow>()

  for (const file of market.cross.portal) {
    for (const [neighborhood, count] of Object.entries(file.kmlPolygonAssignments)) {
      const current = rows.get(neighborhood) ?? { neighborhood, publishedListings: 0, registeredSales: 0 }
      current.publishedListings += Number(count)
      rows.set(neighborhood, current)
    }
  }

  for (const [rawNeighborhood, count] of market.cross.cbrs.categories.BARRIO) {
    const neighborhood = String(rawNeighborhood)
    if (neighborhood === '<NULL>') continue
    const current = rows.get(neighborhood) ?? { neighborhood, publishedListings: 0, registeredSales: 0 }
    current.registeredSales += Number(count)
    rows.set(neighborhood, current)
  }

  return [...rows.values()].sort((left, right) =>
    right.publishedListings + right.registeredSales - (left.publishedListings + left.registeredSales),
  )
}

export function buildMarketContractSnapshot() {
  const reconciliation = valuation.sourceReconciliation
  const portalRows = sumPortalRows()
  const missingCoordinates = sumPortalField('both_missing')
  const noOperationSignal = sumOperationIndicator('no_explicit_indicator')
  const uniqueCbrsEvents = market.cross.cbrs.candidateKeyCardinality.event_comuna_tomo_foja_numero_fecha.unique
  const residentialCbrsRows = market.cross.cbrs.categories.DESCRIPCION
    .filter(([name]) => String(name) === 'DEPARTAMENTO' || String(name) === 'CASA-HABITACION')
    .reduce((sum, [, count]) => sum + Number(count), 0)

  const metrics: ContractMetric[] = [
    {
      key: 'portal_valid_listings',
      label: 'Publicaciones con identificador único',
      value: reconciliation.currentPortalValidListings,
      status: 'available',
      source: 'Portal Inmobiliario',
      period: 'Snapshot entregado por el cliente',
      methodology: 'Conteo de publicaciones con MLC_ID válido.',
      limitation: 'No equivale todavía a propiedades canónicas ni inventario activo.',
    },
    {
      key: 'portal_sale_eligible',
      label: 'Publicaciones elegibles para venta',
      value: reconciliation.currentPortalSaleEligibleListings,
      status: 'partial',
      source: 'Portal Inmobiliario',
      period: 'Snapshot entregado por el cliente',
      methodology: 'Exclusión de filas con señal explícita de arriendo.',
      limitation: 'La operación no está confirmada fila a fila cuando la fuente no trae indicador explícito.',
    },
    {
      key: 'cbrs_registered_rows',
      label: 'Registros CBRS disponibles',
      value: reconciliation.currentCbrsRows,
      status: 'available',
      source: 'Conservador de Bienes Raíces',
      period: '2014 al 9 de enero de 2026',
      methodology: 'Filas registrales disponibles en la base suministrada.',
    },
    {
      key: 'cbrs_unique_events',
      label: 'Eventos registrales únicos',
      value: uniqueCbrsEvents,
      status: 'available',
      source: 'Conservador de Bienes Raíces',
      period: '2014 al 9 de enero de 2026',
      methodology: 'Clave determinística comuna + tomo + foja + número + fecha.',
    },
    {
      key: 'canonical_properties',
      label: 'Propiedades canónicas',
      value: null,
      status: 'pending_source',
      source: 'Portal + CBRS',
      period: 'Pendiente',
      methodology: 'Requiere consolidación por dirección, coordenadas, ROL y revisión de contradicciones.',
    },
    {
      key: 'sales_velocity',
      label: 'Velocidad de venta',
      value: null,
      unit: 'días',
      status: 'pending_source',
      source: 'Historial de publicaciones + ventas confirmadas',
      period: 'Pendiente',
      methodology: 'Diferencia entre primera publicación y venta confirmada o retiro clasificado.',
    },
    {
      key: 'absorption',
      label: 'Indicador de absorción',
      value: null,
      unit: '%',
      status: 'pending_source',
      source: 'Inventario activo + ventas por período',
      period: 'Pendiente',
      methodology: 'Ventas del período divididas por inventario disponible bajo una definición de corte aprobada.',
    },
  ]

  return {
    generatedAt: market.generatedAt,
    scope: market.scope,
    sourceCount: market.sourceInventory.fileCount,
    cellCount: market.sourceInventory.cellManifest.cellCount,
    polygonCount: market.kml.geometryAudit.polygonCount,
    portalRows,
    missingCoordinates,
    missingCoordinatesRate: portalRows > 0 ? missingCoordinates / portalRows : 0,
    noOperationSignal,
    noOperationSignalRate: portalRows > 0 ? noOperationSignal / portalRows : 0,
    residentialCbrsRows,
    metrics,
    neighborhoods: buildNeighborhoodRows(),
    deduplicationPolicy: {
      portalKey: market.operatingModel.deterministicKeys.portal,
      cbrsEventKey: market.operatingModel.deterministicKeys.cbrsEvent,
      cbrsAssetKey: market.operatingModel.deterministicKeys.cbrsAsset,
      confirmedRequires: market.operatingModel.matchPolicy.confirmedRequires,
      candidateEvidence: market.operatingModel.matchPolicy.candidateEvidence,
      statuses: market.operatingModel.matchPolicy.statuses,
      rule: market.operatingModel.matchPolicy.rule,
    },
  }
}
