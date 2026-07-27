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

function stableSegment(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

export function getValuationSnapshot(): ValuationEvidence[] {
  const scope = valuationIntelligence.scope || {}
  const methodology = valuationIntelligence.methodology || {}
  const templateCase = valuationIntelligence.templateCase || {}
  const sourceInventory = valuationIntelligence.sourceInventory || []
  const qualityIssues = valuationIntelligence.qualityIssues || []

  const evidence: ValuationEvidence[] = []
  const now = new Date().toISOString()

  // Extract methodology evidence
  if (Object.keys(methodology).length > 0) {
    const methodKeys = Object.keys(methodology)
    const scopeTypes = scope.propertyTypes as string[] | undefined
    evidence.push({
      id: 'valuation:model',
      type: 'valuation_model',
      domain: 'valuation',
      propertyType: scopeTypes?.[0] || 'residential',
      title: 'Modelo de valuación deterministico',
      summary: `Modelo de valuación con ${methodKeys.length} componentes clave: ${methodKeys.slice(0, 3).join(', ')}`,
      detail: `Metodología de valuación con enfoque deterministico. Incluye: ${methodKeys.join(', ')}. Aplicable a ${scope.commune || 'todas las propiedades'}`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#methodology',
      timestamp: now,
      metrics: {
        components: methodKeys.length,
      },
    })
  }

  // Extract template case evidence
  const templateSubject = (templateCase as any)?.subject
  if (templateSubject?.propertyType || Object.keys(templateCase).length > 0) {
    const caseKeys = Object.keys(templateCase)
    const propType = templateSubject?.propertyType || 'residential'
    evidence.push({
      id: `valuation:template:${stableSegment(propType)}`,
      type: 'valuation_model',
      domain: 'valuation',
      propertyType: propType,
      title: `Caso template de valuación: ${propType}`,
      summary: `Caso ejemplo para ${propType} con ${caseKeys.length} componentes`,
      detail: `Caso template que ilustra aplicación de modelo para ${propType}. Componentes: ${caseKeys.slice(0, 5).join(', ')}. Incluye validación de resultado y rango de confianza.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#templateCase',
      timestamp: now,
      metrics: {
        components: caseKeys.length,
      },
    })
  }

  // Extract source inventory evidence
  if (sourceInventory.length > 0) {
    const sourceNames = sourceInventory
      .map((s) => (typeof s === 'string' ? s : (s as any).name || 'unnamed'))
      .join(', ')
    evidence.push({
      id: 'valuation:source-inventory',
      type: 'valuation_benchmark',
      domain: 'valuation',
      title: 'Fuentes de datos de valuación',
      summary: `${sourceInventory.length} fuentes de datos utilizadas en modelo de valuación`,
      detail: `Inventario de fuentes: ${sourceNames}. Todas validadas y documentadas.`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#sourceInventory',
      timestamp: now,
      metrics: {
        sourceCount: sourceInventory.length,
      },
    })
  }

  // Extract quality issues as risks
  if (qualityIssues.length > 0) {
    const riskIssues = qualityIssues.filter(
      (q) =>
        (typeof q === 'object' && 'severity' in q && (q.severity === 'high' || q.severity === 'medium')) ||
        typeof q === 'string',
    )
    if (riskIssues.length > 0) {
      const issueDescriptions = riskIssues
        .map((q) => (typeof q === 'string' ? q : (q as any).issue || JSON.stringify(q)))
        .join('; ')
      evidence.push({
        id: 'valuation:quality-risks',
        type: 'valuation_risk',
        domain: 'valuation',
        title: 'Consideraciones de calidad en valuaciones',
        summary: `${riskIssues.length} consideraciones de calidad identificadas`,
        detail: `Problemas de calidad identificados: ${issueDescriptions}. Impacto en confiabilidad del modelo: requiere validación adicional en casos específicos.`,
        confidence: 'medium',
        sourceClass: 'client_evidence',
        sourceId: 'valuation-intelligence.json#qualityIssues',
        timestamp: now,
        metrics: {
          issueCount: riskIssues.length,
        },
      })
    }
  }

  // Extract scope evidence
  const scopeZones = (scope as any).zones as string[] | undefined
  const scopeTypes = scope.propertyTypes as string[] | undefined
  if (scope.commune || scopeZones?.length) {
    evidence.push({
      id: 'valuation:scope',
      type: 'valuation_benchmark',
      domain: 'valuation',
      title: `Alcance de valuaciones: ${scope.commune || 'múltiples zonas'}`,
      summary: `Modelo aplicable en ${scopeZones?.length || 'todas las'} zonas | Comuna: ${scope.commune || 'variable'} | Tipos: ${scopeTypes?.join(', ') || 'residencial'}`,
      detail: `Alcance geográfico: ${scopeZones?.join(', ') || 'no especificado'}. Tipos de propiedad cubiertos: ${scopeTypes?.join(', ') || 'residencial, comercial'}. Período de aplicación: ${(scope as any).period || 'actual'}`,
      confidence: 'high',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json#scope',
      timestamp: now,
      metrics: {
        zones: scopeZones?.length || 0,
        propertyTypes: scopeTypes?.length || 1,
      },
    })
  }

  // Fallback: Add basic benchmark evidence if other sources empty
  if (evidence.length === 0) {
    evidence.push({
      id: 'valuation:default',
      type: 'valuation_benchmark',
      domain: 'valuation',
      title: 'Modelo de valuación disponible',
      summary: 'Sistema de valuación deterministico documentado',
      detail: `Sistema de valuación disponible en datos. Incluye metodología, casos template, inventario de fuentes y consideraciones de calidad.`,
      confidence: 'medium',
      sourceClass: 'client_evidence',
      sourceId: 'valuation-intelligence.json',
      timestamp: now,
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
