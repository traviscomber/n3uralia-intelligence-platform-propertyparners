import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'
import { getOperationalMarketSnapshot } from '@/lib/market-operational'

export type CanonicalMarketReconciliation = {
  generatedAt: string
  scope: {
    commune: string
    operation: string
    propertyTypes: string[]
    excludedOperation: string
  }
  canonical: {
    sourceFiles: number
    portalValidListings: number
    portalSaleEligibleListings: number
    portalRentQuarantine: number
    cbrsRows: number
    neighborhoods: number
  }
  operational: {
    properties: number | null
    activeListings: number | null
    confirmedProperties: number | null
    confirmedSales: number | null
    missingNeighborhoods: number | null
    ingestionRuns: number | null
    latestObservedAt: string | null
  }
  coverage: {
    portalMaterializedRate: number | null
    territorialCoverageRate: number | null
  }
  gaps: {
    portalListingsNotMaterialized: number | null
    cbrsRowsNotMaterialized: number | null
    neighborhoodsMissing: number | null
    identitiesUnconfirmed: number | null
  }
  notes: string[]
  error?: string
}

export async function getCanonicalMarketReconciliation(): Promise<CanonicalMarketReconciliation> {
  const operational = await getOperationalMarketSnapshot()
  const sourceReconciliation = valuation.sourceReconciliation
  const portalValidListings = Number(sourceReconciliation.currentPortalValidListings ?? 0)
  const portalSaleEligibleListings = Number(sourceReconciliation.currentPortalSaleEligibleListings ?? 0)
  const portalRentQuarantine = Number(sourceReconciliation.portalListingsQuarantinedByRentIndicator ?? 0)
  const cbrsRows = Number(sourceReconciliation.currentCbrsRows ?? 0)
  const operationalProperties = operational.canonicalProperties
  const missingNeighborhoods = operational.missingNeighborhoods
  const neighborhoods = Number(market.kml.geometryAudit.polygonCount ?? market.kml.counts.placemarks ?? 0)

  const portalMaterializedRate = operationalProperties !== null && portalValidListings > 0
    ? operationalProperties / portalValidListings
    : null
  const territorialCoverageRate = operationalProperties !== null && operationalProperties > 0 && missingNeighborhoods !== null
    ? (operationalProperties - missingNeighborhoods) / operationalProperties
    : null

  return {
    generatedAt: market.generatedAt,
    scope: market.scope,
    canonical: {
      sourceFiles: market.sourceInventory.fileCount,
      portalValidListings,
      portalSaleEligibleListings,
      portalRentQuarantine,
      cbrsRows,
      neighborhoods,
    },
    operational: {
      properties: operationalProperties,
      activeListings: operational.activeInventory,
      confirmedProperties: operational.confirmedProperties,
      confirmedSales: operational.confirmedSales,
      missingNeighborhoods,
      ingestionRuns: operational.ingestionRuns,
      latestObservedAt: operational.latestObservedAt,
    },
    coverage: {
      portalMaterializedRate,
      territorialCoverageRate,
    },
    gaps: {
      portalListingsNotMaterialized: operationalProperties === null ? null : Math.max(0, portalValidListings - operationalProperties),
      cbrsRowsNotMaterialized: operational.confirmedSales === null ? null : Math.max(0, cbrsRows - operational.confirmedSales),
      neighborhoodsMissing: missingNeighborhoods,
      identitiesUnconfirmed: operationalProperties === null || operational.confirmedProperties === null
        ? null
        : Math.max(0, operationalProperties - operational.confirmedProperties),
    },
    notes: [
      'Una publicación Portal no equivale automáticamente a una propiedad única.',
      'Una fila CBRS no equivale automáticamente a una venta residencial comparable.',
      'La identidad sólo puede confirmarse con evidencia suficiente y revisión humana.',
      'Los retiros de publicaciones no se clasifican automáticamente como ventas.',
    ],
    error: operational.error,
  }
}
