import valuationIntelligence from '@/data/valuation-intelligence.json'

export type ValuationEvidence = {
  id: string
  type: 'valuation_model' | 'valuation_benchmark' | 'valuation_risk' | 'valuation_opportunity'
  domain: string
  propertyType?: string
  title: string
  summary: string
  detail: string
  confidence: 'high' | 'medium' | 'low'
  sourceClass: 'client_evidence'
  sourceId: string
  timestamp: string
  metrics?: Record<string, number | string>
}

export function getValuationSnapshot(): ValuationEvidence[] {
  const models = valuationIntelligence.models || {}
  const evaluationCriteria = valuationIntelligence.evaluationCriteria || []
  const benchmarks = valuationIntelligence.benchmarks || []

  const evidence: ValuationEvidence[] = []
  const now = new Date().toISOString()

  // Extract model evidence
  Object.entries(models).forEach(([propertyType, model]) => {
    if (typeof model === 'object' && model !== null && 'baseFormula' in model) {
      const m = model as any
      const components = Object.keys(m.components || {})

      evidence.push({
        id: `valuation-model-${propertyType}-${Date.now()}`,
        type: 'valuation_model',
        domain: 'valuation',
        propertyType,
        title: `Modelo de valuación: ${propertyType}`,
        summary: `Modelo con ${components.length} componentes de valuación. Base: ${m.baseFormula || 'standard'}`,
        detail: `Modelo de valuación para ${propertyType}. Componentes: ${components.join(', ')}. Criterios aplicables: ${m.criteria?.join(', ') || 'estándar'}`,
        confidence: 'high',
        sourceClass: 'client_evidence',
        sourceId: `valuation-intelligence.json#models[${propertyType}]`,
        timestamp: now,
        metrics: {
          components: components.length,
          basePrice: m.basePrice || 0,
        },
      })
    }
  })

  // Extract evaluation criteria evidence
  if (evaluationCriteria.length > 0) {
    evidence.push({
      id: `valuation-criteria-${Date.now()}`,
      type: 'valuation_benchmark',
      domain: 'valuation',
      title: 'Criterios de evaluación de propiedades',
      summary: `${evaluationCriteria.length} criterios de evaluación aplicados a todas las valuaciones`,
      detail: `Criterios de evaluación: ${evaluationCriteria.join(', ')}. Aplicables a análisis y scoring de propiedades.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#evaluationCriteria',
      timestamp: now,
      metrics: {
        criteriaCount: evaluationCriteria.length,
      },
    })
  }

  // Extract benchmark evidence
  benchmarks.forEach((bench) => {
    if (bench.name && bench.value !== null && bench.value !== undefined) {
      evidence.push({
        id: `valuation-bench-${bench.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        type: 'valuation_benchmark',
        domain: 'valuation',
        propertyType: bench.type || 'residential',
        title: `Benchmark: ${bench.name}`,
        summary: `${bench.name}: ${bench.value} ${bench.unit || ''} (${bench.period || 'período actual'})`,
        detail: `Benchmark de referencia. Nombre: ${bench.name}. Valor: ${bench.value} ${bench.unit || ''}. Tipo: ${bench.type || 'residential'}. Período: ${bench.period || 'actual'}`,
        confidence: bench.confidence || 'medium',
        sourceClass: 'client_evidence',
        sourceId: `valuation-intelligence.json#benchmarks[${bench.name}]`,
        timestamp: now,
        metrics: {
          value: bench.value,
          period: bench.period,
        },
      })
    }
  })

  // Extract case template evidence if available
  const caseTemplate = valuationIntelligence.caseTemplate
  if (caseTemplate && typeof caseTemplate === 'object') {
    const caseKeys = Object.keys(caseTemplate)
    evidence.push({
      id: `valuation-case-template-${Date.now()}`,
      type: 'valuation_model',
      domain: 'valuation',
      title: 'Estructura de casos de valuación',
      summary: `Plantilla estándar con ${caseKeys.length} componentes para documentación de valuaciones`,
      detail: `Estructura de casos: ${caseKeys.join(', ')}. Define formato y datos requeridos para cada valuación realizada.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#caseTemplate',
      timestamp: now,
      metrics: {
        templateFields: caseKeys.length,
      },
    })
  }

  // Risk and opportunity analysis
  const models_entries = Object.keys(models)
  if (models_entries.length > 1) {
    evidence.push({
      id: `valuation-model-coverage-${Date.now()}`,
      type: 'valuation_opportunity',
      domain: 'valuation',
      title: 'Cobertura de modelos de valuación',
      summary: `${models_entries.length} tipos de propiedad con modelos de valuación implementados`,
      detail: `Modelos disponibles para: ${models_entries.join(', ')}. Permite análisis consistente y comparable entre tipos de propiedades.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#models',
      timestamp: now,
      metrics: {
        modelCount: models_entries.length,
      },
    })
  }

  return evidence
}

export function getValuationEvidenceSummary() {
  const evidence = getValuationSnapshot()
  return {
    totalEvidence: evidence.length,
    byType: {
      model: evidence.filter((e) => e.type === 'valuation_model').length,
      benchmark: evidence.filter((e) => e.type === 'valuation_benchmark').length,
      risk: evidence.filter((e) => e.type === 'valuation_risk').length,
      opportunity: evidence.filter((e) => e.type === 'valuation_opportunity').length,
    },
    propertyTypes: [...new Set(evidence.map((e) => e.propertyType).filter(Boolean))],
    sourceCount: new Set(evidence.map((e) => e.sourceId)).size,
  }
}
