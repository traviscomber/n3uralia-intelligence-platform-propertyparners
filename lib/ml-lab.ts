import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'

export type MlLabStatus = 'ready' | 'partial' | 'blocked'

export type MlLabCheck = {
  label: string
  status: MlLabStatus
  value: string
  evidence: string
}

export function getMlLabSnapshot() {
  const apartmentSource = market.cross.portal.find((source) => source.file === 'portal_detalle_deptos_full.xlsx')
  const projectSource = market.cross.portal.find((source) => source.file === 'portal_detalle_Proyectos.xlsx')
  const houseSource = market.cross.portal.find((source) => source.file === 'portal_urls_casas_final.xlsx')
  const cbrs = market.cross.cbrs
  const validOffers = valuation.sourceReconciliation.currentPortalValidListings
  const eligibleOffers = valuation.sourceReconciliation.currentPortalSaleEligibleListings
  const exactRegisteredComparables = valuation.templateCase.registeredComparables.exactInCurrentCbrs
  const registeredTemplateComparables = valuation.templateCase.registeredComparables.sourceCount
  const exactGeoRows = cbrs.barrioComparison.coordinate_agrees_with_barrio
  const pendingGeoRows = cbrs.coordinateQuality.both_missing
  const outsideGeoRows = cbrs.coordinateQuality.outside_all_kml_polygons
  const apartmentRows = apartmentSource?.rows || 0
  const apartmentRowsWithCoordinates = apartmentSource?.coordinateQuality.single_polygon || 0
  const apartmentRowsMissingCoordinates = apartmentSource?.coordinateQuality.both_missing || 0
  const projectRows = projectSource?.rows || 0
  const houseRows = houseSource?.rows || 0

  const checks: MlLabCheck[] = [
    {
      label: 'Oferta Portal',
      status: 'ready',
      value: `${eligibleOffers.toLocaleString('es-CL')} elegibles`,
      evidence: `${validOffers.toLocaleString('es-CL')} publicaciones válidas; ${valuation.sourceReconciliation.portalListingsQuarantinedByRentIndicator} señales de arriendo permanecen en cuarentena.`,
    },
    {
      label: 'Ventas CBRS',
      status: 'ready',
      value: `${cbrs.rows.toLocaleString('es-CL')} registros`,
      evidence: `La clave evento + ROL es única en ${cbrs.candidateKeyCardinality.event_plus_rol.unique.toLocaleString('es-CL')} filas.`,
    },
    {
      label: 'Geografía CBRS',
      status: 'partial',
      value: `${exactGeoRows.toLocaleString('es-CL')} exactos`,
      evidence: `${pendingGeoRows.toLocaleString('es-CL')} sin coordenadas y ${outsideGeoRows.toLocaleString('es-CL')} fuera de polígonos permanecen visibles.`,
    },
    {
      label: 'Geografía Portal',
      status: 'partial',
      value: `${apartmentRowsWithCoordinates.toLocaleString('es-CL')} deptos asignados`,
      evidence: `${apartmentRowsMissingCoordinates.toLocaleString('es-CL')} de ${apartmentRows.toLocaleString('es-CL')} departamentos y ${houseRows.toLocaleString('es-CL')} casas no tienen coordenadas en la fuente.`,
    },
    {
      label: 'Pares oferta–cierre',
      status: 'blocked',
      value: 'Dataset no construido',
      evidence: `La auditoría histórica solo reproduce exactamente ${exactRegisteredComparables} de ${registeredTemplateComparables} comparables inscritos; no constituye un set de entrenamiento.`,
    },
    {
      label: 'Backtesting temporal',
      status: 'blocked',
      value: 'No ejecutado',
      evidence: 'No existe todavía una versión entrenada ni un conjunto fuera de muestra versionado.',
    },
  ]

  return {
    status: 'research_only' as const,
    modelVersions: 0,
    approvedVersions: 0,
    validOffers,
    eligibleOffers,
    cbrsRows: cbrs.rows,
    polygonCount: market.kml.geometryAudit.polygonCount,
    apartmentRows,
    projectRows,
    houseRows,
    checks,
    historicalCase: valuation.templateCase,
    qualityIssues: valuation.qualityIssues,
  }
}
