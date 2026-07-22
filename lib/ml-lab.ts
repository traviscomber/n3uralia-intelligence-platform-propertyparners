import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'

export type MlLabStatus = 'ready' | 'partial' | 'blocked'

export type MlLabCheck = {
  label: string
  status: MlLabStatus
  value: string
  requirement: string
  evidence: string
  blocksTraining: boolean
}

export type MlExperimentContract = {
  version: '1.0.0'
  target: 'registered_sale_price_uf'
  segments: readonly ['apartment', 'house']
  splitStrategy: 'temporal'
  baseline: 'property_partners_excel_rules'
  sourceHashes: string[]
  confirmedPairs: number
  trainingEnabled: boolean
  activation: 'professional_approval_required'
}

function percentage(part: number, total: number) {
  return total ? (part / total) * 100 : 0
}

export function getMlLabSnapshot() {
  const apartmentSource = market.cross.portal.find((source) => source.file === 'portal_detalle_deptos_full.xlsx')
  const projectSource = market.cross.portal.find((source) => source.file === 'portal_detalle_Proyectos.xlsx')
  const houseSource = market.cross.portal.find((source) => source.file === 'portal_urls_casas_final.xlsx')
  const cbrs = market.cross.cbrs
  const portalRows = market.cross.portal.reduce((sum, source) => sum + source.rows, 0)
  const noOperationIndicator = market.cross.portal.reduce((sum, source) => sum + (source.operationIndicators.no_explicit_indicator || 0), 0)
  const portalGeoAssigned = market.cross.portal.reduce((sum, source) => sum + (source.coordinateQuality.single_polygon || 0), 0)
  const portalGeoMissing = market.cross.portal.reduce((sum, source) => sum + (source.coordinateQuality.both_missing || 0), 0)
  const residentialCbrsRows = cbrs.categories.DESCRIPCION
    .filter(([description]) => description === 'DEPARTAMENTO' || description === 'CASA-HABITACION')
    .reduce((sum, [, count]) => sum + Number(count), 0)
  const cbrsEvents = cbrs.candidateKeyCardinality.event_comuna_tomo_foja_numero_fecha.unique
  const validOffers = valuation.sourceReconciliation.currentPortalValidListings
  const eligibleOffers = valuation.sourceReconciliation.currentPortalSaleEligibleListings
  const exactRegisteredComparables = valuation.templateCase.registeredComparables.exactInCurrentCbrs
  const registeredTemplateComparables = valuation.templateCase.registeredComparables.sourceCount
  const apartmentRows = apartmentSource?.rows || 0
  const projectRows = projectSource?.rows || 0
  const houseRows = houseSource?.rows || 0

  const checks: MlLabCheck[] = [
    {
      label: 'Identidad de publicaciones', status: 'partial', value: `${validOffers.toLocaleString('es-CL')} IDs únicos`,
      requirement: 'Propiedades canónicas y snapshots fechados',
      evidence: `${portalRows.toLocaleString('es-CL')} filas originan ${validOffers.toLocaleString('es-CL')} publicaciones únicas; un ID de publicación no demuestra una propiedad única a través del tiempo.`, blocksTraining: true,
    },
    {
      label: 'Operación de oferta', status: 'partial', value: `${percentage(noOperationIndicator, portalRows).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% sin indicador`,
      requirement: 'Venta confirmada o regla explícita de inclusión',
      evidence: `${noOperationIndicator.toLocaleString('es-CL')} de ${portalRows.toLocaleString('es-CL')} filas no declaran operación; ${valuation.sourceReconciliation.portalListingsQuarantinedByRentIndicator} señales explícitas de arriendo están excluidas.`, blocksTraining: true,
    },
    {
      label: 'Eventos CBRS', status: 'partial', value: `${cbrsEvents.toLocaleString('es-CL')} eventos`,
      requirement: 'Eventos residenciales derivados y versionados',
      evidence: `${cbrs.rows.toLocaleString('es-CL')} activos registrales se agrupan en ${cbrsEvents.toLocaleString('es-CL')} eventos; ${residentialCbrsRows.toLocaleString('es-CL')} filas están descritas como departamento o casa-habitación.`, blocksTraining: true,
    },
    {
      label: 'Geografía Portal', status: 'partial', value: `${percentage(portalGeoAssigned, portalRows).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% asignación única`,
      requirement: 'Cobertura medible por segmento y barrio',
      evidence: `${portalGeoAssigned.toLocaleString('es-CL')} filas tienen un polígono único y ${portalGeoMissing.toLocaleString('es-CL')} no tienen coordenadas; las ${houseRows.toLocaleString('es-CL')} casas están en este último grupo.`, blocksTraining: true,
    },
    {
      label: 'Pares oferta–cierre', status: 'blocked', value: '0 pares confirmados',
      requirement: 'Enlaces auditables sin matching silencioso',
      evidence: `La auditoría histórica reproduce exactamente ${exactRegisteredComparables} de ${registeredTemplateComparables} comparables inscritos, pero no enlaza publicaciones Portal actuales con cierres CBRS.`, blocksTraining: true,
    },
    {
      label: 'Baseline Property Partners', status: 'ready', value: 'Reglas reproducibles',
      requirement: 'Comparación obligatoria de cada challenger',
      evidence: 'Las fórmulas separadas para casas y departamentos y los márgenes 0%, 5% y 10% están trazados a celdas de los Excel.', blocksTraining: false,
    },
    {
      label: 'Backtesting temporal', status: 'blocked', value: 'No ejecutado',
      requirement: 'Train/test temporal versionado',
      evidence: 'No existe todavía un dataset enlazado ni una versión entrenada; el único caso histórico no constituye validación estadística.', blocksTraining: true,
    },
  ]

  const experimentContract: MlExperimentContract = {
    version: '1.0.0',
    target: 'registered_sale_price_uf',
    segments: ['apartment', 'house'],
    splitStrategy: 'temporal',
    baseline: 'property_partners_excel_rules',
    sourceHashes: [
      ...market.sourceInventory.files.map((file) => file.sha256),
      ...valuation.sourceInventory.map((file) => file.sha256),
    ],
    confirmedPairs: market.operatingModel.matchPolicy.currentConfirmedMatches,
    trainingEnabled: false,
    activation: 'professional_approval_required',
  }

  return {
    status: 'research_only' as const, canTrainPriceModel: false, modelVersions: 0, approvedVersions: 0,
    validOffers, eligibleOffers, cbrsRows: cbrs.rows, cbrsEvents, residentialCbrsRows,
    polygonCount: market.kml.geometryAudit.polygonCount, portalRows, portalGeoAssigned,
    apartmentRows, apartmentGeoAssigned: apartmentSource?.coordinateQuality.single_polygon || 0,
    projectRows, houseRows, houseGeoAssigned: houseSource?.coordinateQuality.single_polygon || 0,
    readyChecks: checks.filter((check) => check.status === 'ready').length,
    blockingChecks: checks.filter((check) => check.blocksTraining && check.status !== 'ready').length,
    checks, experimentContract, historicalCase: valuation.templateCase,
    prohibitedAdjustments: valuation.methodology.prohibitedAutomaticAdjustments,
  }
}
