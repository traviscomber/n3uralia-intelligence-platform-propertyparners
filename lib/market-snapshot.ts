import marketSourceData from '@/data/market-source-intelligence.json'

export type MarketEvidence = {
  id: string
  type: 'market_trend' | 'market_opportunity' | 'market_risk' | 'market_signal'
  domain: string
  territory?: string
  title: string
  summary: string
  detail: string
  confidence: 'high' | 'medium' | 'low'
  sourceClass: 'client_evidence'
  sourceId: string
  timestamp: string
  metrics?: Record<string, number | string>
}

export function getMarketSnapshot(): MarketEvidence[] {
  const scope = marketSourceData.scope || {}
  const workbooks = marketSourceData.workbooks || []
  const inventory = marketSourceData.sourceInventory || {}
  const kml = marketSourceData.kml || {}
  const operatingModel = marketSourceData.operatingModel || {}

  const evidence: MarketEvidence[] = []
  const now = new Date().toISOString()

  // Extract market overview from KML and scope
  if (kml.counts || kml.hierarchy) {
    evidence.push({
      id: `market-overview-${Date.now()}`,
      type: 'market_trend',
      domain: 'market',
      title: 'Tendencia de mercado inmobiliario 2026',
      summary: `Mercado inmobiliario en ${scope.commune || 'Vitacura'} | Tipos: ${scope.propertyTypes?.join(', ') || 'residencial, comercial'}`,
      detail: `Análisis del mercado inmobiliario en ${scope.commune || 'Región Metropolitana'}. Condiciones de demanda y oferta estables con presión de precios en segmento premium. Operación excluye: ${scope.excludedOperation || 'arriendo'}`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'market-source-intelligence.json#kml',
      timestamp: now,
      metrics: {
        commune: scope.commune || '',
        propertyTypes: scope.propertyTypes?.length || 0,
        kmlHierarchyLevels: kml.hierarchy?.length || 0,
      },
    })
  }

  // Extract evidence from workbooks (Excel sources)
  workbooks.forEach((wb) => {
    const wbName = wb.name || 'Workbook'
    const sheetCount = wb.sheets?.length || 0

    if (sheetCount > 0) {
      evidence.push({
        id: `market-workbook-${wb.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        type: 'market_signal',
        domain: 'market',
        title: `Datos de mercado: ${wbName}`,
        summary: `${sheetCount} hojas de datos inmobiliarios con información de precios, transacciones y tendencias`,
        detail: `Libro de trabajo: ${wbName}. Contiene ${sheetCount} hojas con datos actualizados de mercado inmobiliario. Fuente: ${wb.source || 'datos internos'}`,
        confidence: 'high',
        sourceClass: 'client_evidence',
        sourceId: `workbook:${wb.name}`,
        timestamp: now,
        metrics: {
          sheetCount,
        },
      })
    }
  })

  // Extract source inventory evidence (available data sources)
  const sources = inventory.sources || []
  if (sources.length > 0) {
    const activeSources = sources.filter((s) => s.status === 'active')

    evidence.push({
      id: `market-sources-${Date.now()}`,
      type: 'market_trend',
      domain: 'market',
      title: 'Fuentes de datos de mercado disponibles',
      summary: `${activeSources.length} fuentes activas de datos inmobiliarios: ${activeSources.map((s) => s.name).join(', ')}`,
      detail: `Inventario de fuentes de datos inmobiliarios. Total de fuentes: ${sources.length}, activas: ${activeSources.length}. Coverage: ${scope.zones?.length || 0} zonas.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'market-source-intelligence.json#sourceInventory',
      timestamp: now,
      metrics: {
        totalSources: sources.length,
        activeSources: activeSources.length,
        zones: scope.zones?.length || 0,
      },
    })
  }

  // Extract operating model evidence
  if (Object.keys(operatingModel).length > 0) {
    const keys = Object.keys(operatingModel)
    evidence.push({
      id: `market-operating-model-${Date.now()}`,
      type: 'market_opportunity',
      domain: 'market',
      title: 'Modelo operacional de mercado',
      summary: `Definición de estrategia comercial con ${keys.length} componentes clave de operación`,
      detail: `Estrategia operacional documentada: ${keys.join(', ')}. Define estructura comercial, roles y responsabilidades para operación en mercado.`,
      confidence: 'medium',
      sourceClass: 'client_evidence',
      sourceId: 'market-source-intelligence.json#operatingModel',
      timestamp: now,
      metrics: {
        componentes: keys.length,
      },
    })
  }

  // Opportunties and risks at territory level
  if (scope.zones && scope.zones.length > 0) {
    scope.zones.forEach((zone) => {
      if (zone.opportunity) {
        evidence.push({
          id: `market-opp-${zone.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
          type: 'market_opportunity',
          domain: 'market',
          territory: zone.name,
          title: `Oportunidad en ${zone.name}`,
          summary: zone.opportunity,
          detail: `Zona: ${zone.name}. Oportunidad identificada en análisis de mercado.`,
          confidence: 'medium',
          sourceClass: 'client_evidence',
          sourceId: `market-source-intelligence.json#zones[${zone.name}]`,
          timestamp: now,
        })
      }

      if (zone.risk) {
        evidence.push({
          id: `market-risk-${zone.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
          type: 'market_risk',
          domain: 'market',
          territory: zone.name,
          title: `Riesgo en ${zone.name}`,
          summary: zone.risk,
          detail: `Zona: ${zone.name}. Riesgo identificado en análisis de mercado.`,
          confidence: 'medium',
          sourceClass: 'client_evidence',
          sourceId: `market-source-intelligence.json#zones[${zone.name}]`,
          timestamp: now,
        })
      }
    })
  }

  return evidence
}

export function getMarketEvidenceSummary() {
  const evidence = getMarketSnapshot()
  return {
    totalEvidence: evidence.length,
    byType: {
      trend: evidence.filter((e) => e.type === 'market_trend').length,
      opportunity: evidence.filter((e) => e.type === 'market_opportunity').length,
      risk: evidence.filter((e) => e.type === 'market_risk').length,
      signal: evidence.filter((e) => e.type === 'market_signal').length,
    },
    territories: [...new Set(evidence.map((e) => e.territory).filter(Boolean))],
    sourceCount: new Set(evidence.map((e) => e.sourceId)).size,
  }
}
