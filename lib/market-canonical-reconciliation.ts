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
    properties: number
    activeListings: number
    confirmedProperties: number
    confirmedSales: number
    missingNeighborhoods: number
    ingestionRuns: number
    latestObservedAt: string | null
  }
  coverage: {
    portalMaterializedRate: number
    territorialCoverageRate: number
  }
  gaps: {
    portalListingsNotMaterialized: number
    cbrsRowsNotMaterialized: number
    neighborhoodsMissing: number
    identitiesUnconfirmed: number
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
  const operationalProperties = operational.canonicalProperties ?? 0
  const missingNeighborhoods = operational.missingNeighborhoods ?? 0
  const neighborhoods = Number(market.kml.geometryAudit.polygonCount ?? market.kml.counts.placemarks ?? 0)

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
      activeListings: operational.activeInventory ?? 0,
      confirmedProperties: operational.confirmedProperties ?? 0,
      confirmedSales: operational.confirmedSales ?? 0,
      missingNeighborhoods,
      ingestionRuns: operational.ingestionRuns ?? 0,
      latestObservedAt: operational.latestObservedAt,
    },
    coverage: {
      portalMaterializedRate: portalValidListings > 0 ? operationalProperties / portalValidListings : 0,
      territorialCoverageRate: operationalProperties > 0 ? (operationalProperties - missingNeighborhoods) / operationalProperties : 0,
    },
    gaps: {
      portalListingsNotMaterialized: Math.max(0, portalValidListings - operationalProperties),
      cbrsRowsNotMaterialized: Math.max(0, cbrsRows - (operational.confirmedSales ?? 0)),
      neighborhoodsMissing: missingNeighborhoods,
      identitiesUnconfirmed: Math.max(0, operationalProperties - (operational.confirmedProperties ?? 0)),
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
