import marketSourceData from '@/data/market-source-intelligence.json'

export type MarketEvidence = {
  id: string
  type: 'market_trend' | 'market_opportunity' | 'market_risk' | 'market_signal'
  domain: 'market'
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

type MarketSourceFile = {
  file?: string
  role?: string
  bytes?: number
}

type MarketWorkbook = {
  file?: string
  sheetCount?: number
  sheets?: unknown[]
  sheetNames?: string[]
  sourceRole?: string
}

export function getMarketSnapshot(): MarketEvidence[] {
  const scope = marketSourceData.scope || {}
  const inventory = marketSourceData.sourceInventory || {}
  const kml = marketSourceData.kml || {}
  const workbooks = ((marketSourceData as unknown as { workbooks?: MarketWorkbook[] }).workbooks || [])
  const files = ((inventory as { files?: MarketSourceFile[] }).files || [])
  const timestamp = marketSourceData.generatedAt || new Date().toISOString()
  const evidence: MarketEvidence[] = []

  const roleCounts = files.reduce<Record<string, number>>((accumulator, file) => {
    const role = file.role || 'unknown'
    accumulator[role] = (accumulator[role] || 0) + 1
    return accumulator
  }, {})

  if (files.length > 0) {
    const roleSummary = Object.entries(roleCounts)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ')

    evidence.push({
      id: 'market.source-inventory',
      type: 'market_signal',
      domain: 'market',
      territory: scope.commune,
      title: 'Cobertura de fuentes de mercado disponibles',
      summary: `${files.length} fuentes inventariadas para ${scope.commune || 'el territorio analizado'} (${roleSummary})`,
      detail: 'Este indicador acredita disponibilidad de archivos, no demuestra por sí solo tendencias de demanda, precios, absorción ni competitividad. Los KPIs cuantitativos requieren agregados derivados de los registros contenidos en esas fuentes.',
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'market-source-intelligence.json#sourceInventory',
      timestamp,
      metrics: {
        totalFiles: files.length,
        publishedOfferFiles: roleCounts.published_offer || 0,
        registeredSalesFiles: roleCounts.registered_sales || 0,
        geometryFiles: roleCounts.neighborhood_geometry || 0,
      },
    })
  }

  const placemarks = Array.isArray(kml.placemarks) ? kml.placemarks : []
  if (placemarks.length > 0) {
    const neighborhoods = placemarks
      .map((placemark: { name?: string }) => placemark.name)
      .filter((name: string | undefined): name is string => Boolean(name))

    evidence.push({
      id: 'market.territorial-coverage',
      type: 'market_signal',
      domain: 'market',
      territory: scope.commune,
      title: 'Cobertura territorial disponible',
      summary: `${neighborhoods.length} barrios o sectores georreferenciados en ${scope.commune || 'el territorio analizado'}`,
      detail: `La geometría disponible permite segmentar análisis futuros por barrio. Sectores identificados: ${neighborhoods.join(', ')}. No constituye evidencia de desempeño comercial o evolución de precios.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'market-source-intelligence.json#kml.placemarks',
      timestamp,
      metrics: {
        neighborhoods: neighborhoods.length,
        coordinates: Number(kml.counts?.coordinates || 0),
      },
    })
  }

  for (const workbook of workbooks) {
    const sheetCount = workbook.sheetCount || workbook.sheets?.length || workbook.sheetNames?.length || 0
    if (sheetCount === 0) continue

    evidence.push({
      id: `market.workbook.${(workbook.file || 'unknown').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`,
      type: 'market_signal',
      domain: 'market',
      territory: scope.commune,
      title: `Fuente tabular de mercado: ${workbook.file || 'sin nombre'}`,
      summary: `${sheetCount} hojas disponibles para procesamiento cuantitativo`,
      detail: `Fuente declarada como ${workbook.sourceRole || 'sin rol documentado'}. La presencia del archivo no se interpreta como una tendencia; deben calcularse agregados reproducibles antes de emitir conclusiones.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: `market-source-intelligence.json#workbooks.${workbook.file || 'unknown'}`,
      timestamp,
      metrics: { sheetCount },
    })
  }

  const hasPublishedOffer = (roleCounts.published_offer || 0) > 0
  const hasRegisteredSales = (roleCounts.registered_sales || 0) > 0

  evidence.push({
    id: 'market.quantitative-readiness',
    type: hasPublishedOffer && hasRegisteredSales ? 'market_opportunity' : 'market_risk',
    domain: 'market',
    territory: scope.commune,
    title: 'Preparación para inteligencia cuantitativa de mercado',
    summary: hasPublishedOffer && hasRegisteredSales
      ? 'Existen fuentes de oferta publicada y ventas registradas para construir KPIs comparables'
      : 'Faltan universos complementarios para construir KPIs comparables de mercado',
    detail: hasPublishedOffer && hasRegisteredSales
      ? 'El siguiente paso válido es generar agregados trazables por período, tipo de propiedad y barrio: stock publicado, precios, UF/m², dispersión, ventas registradas y brecha oferta-cierre. Hasta entonces no deben afirmarse tendencias de demanda, presión de precios o absorción.'
      : 'Se requieren fuentes separadas de oferta y ventas efectivas antes de producir conclusiones cuantitativas de mercado.',
    confidence: 'high',
    sourceClass: 'client_evidence',
    sourceId: 'market-source-intelligence.json#sourceInventory',
    timestamp,
    metrics: {
      publishedOfferFiles: roleCounts.published_offer || 0,
      registeredSalesFiles: roleCounts.registered_sales || 0,
    },
  })

  return evidence
}

export function getMarketEvidenceSummary() {
  const evidence = getMarketSnapshot()

  return {
    totalEvidence: evidence.length,
    byType: {
      trend: evidence.filter((item) => item.type === 'market_trend').length,
      opportunity: evidence.filter((item) => item.type === 'market_opportunity').length,
      risk: evidence.filter((item) => item.type === 'market_risk').length,
      signal: evidence.filter((item) => item.type === 'market_signal').length,
    },
    territories: [...new Set(evidence.map((item) => item.territory).filter(Boolean))],
    sourceCount: new Set(evidence.map((item) => item.sourceId)).size,
  }
}
