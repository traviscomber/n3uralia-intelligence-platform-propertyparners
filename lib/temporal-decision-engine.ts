import {
  getExecutiveTemporalSnapshot,
  type TemporalMetricKey,
  type TemporalTrend,
} from '@/lib/temporal-performance'

export type TemporalDecisionPriority = 'high' | 'medium' | 'low'
export type TemporalDecisionConfidence = 'high' | 'medium' | 'low'

export type TemporalDecisionRecommendation = {
  id: string
  metric: TemporalMetricKey
  title: string
  rationale: string
  action: string
  priority: TemporalDecisionPriority
  confidence: TemporalDecisionConfidence
  evidenceKeys: string[]
  expectedOutcome: string
  guardrail: string
}

function confidenceForTrend(trend: TemporalTrend): TemporalDecisionConfidence {
  if (trend.latestValue === null || trend.previousValue === null) return 'low'
  if (trend.streakLength >= 3 || trend.anomaly) return 'high'
  return 'medium'
}

function evidenceKeys(metric: TemporalMetricKey) {
  return [
    `client.crm.mom.${metric}`,
    `client.crm.yoy.${metric}`,
  ]
}

function recommendationForTrend(trend: TemporalTrend): TemporalDecisionRecommendation | null {
  const confidence = confidenceForTrend(trend)
  const base = {
    metric: trend.metric,
    confidence,
    evidenceKeys: evidenceKeys(trend.metric),
  }

  if (trend.metric === 'salesCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning')) {
    return {
      ...base,
      id: 'temporal.decision.sales-recovery',
      title: 'Activar revisión de recuperación de cierres',
      rationale: trend.summary,
      action: 'Revisar el embudo por sucursal y agente, identificar en qué etapa se concentra la caída y definir responsables con seguimiento semanal hasta revertir la tendencia.',
      priority: trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Aislar la etapa que explica la desaceleración y recuperar velocidad de cierre sin asumir que el problema es únicamente precio o mercado.',
      guardrail: 'No reducir precios ni comisiones sin contrastar visitas, leads, stock, atribución y contexto de mercado.',
    }
  }

  if (trend.metric === 'salesUf' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning' || trend.anomaly)) {
    return {
      ...base,
      id: 'temporal.decision.sales-uf-mix',
      title: 'Auditar cambio en el mix económico vendido',
      rationale: trend.summary,
      action: 'Comparar UF vendidas, número de cierres y mediana por operación para determinar si el cambio proviene de volumen, ticket promedio o composición de propiedades.',
      priority: trend.anomaly ? 'high' : 'medium',
      expectedOutcome: 'Separar una variación real de desempeño de un cambio en el mix de operaciones.',
      guardrail: 'No interpretar UF vendidas como productividad comercial sin controlar cantidad de cierres y ticket.',
    }
  }

  if (trend.metric === 'newLeadsCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning')) {
    return {
      ...base,
      id: 'temporal.decision.lead-generation',
      title: 'Intervenir generación y calidad de leads',
      rationale: trend.summary,
      action: 'Desagregar leads por origen, sucursal y responsable; priorizar fuentes con mejor conversión y detener inversión incremental en canales sin trazabilidad suficiente.',
      priority: trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Recuperar flujo comercial priorizando fuentes con evidencia de conversión.',
      guardrail: 'No aumentar presupuesto de adquisición mientras la atribución y clasificación de leads sean incompletas.',
    }
  }

  if (trend.metric === 'capturesCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning')) {
    return {
      ...base,
      id: 'temporal.decision.captures',
      title: 'Recuperar ritmo de captaciones',
      rationale: trend.summary,
      action: 'Revisar captaciones por agente, zona y tipo de propiedad; definir metas de actividad y una lista priorizada de propietarios a contactar.',
      priority: trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Evitar que la caída de inventario futuro se traduzca en menor capacidad de venta.',
      guardrail: 'No premiar volumen de captaciones sin revisar calidad, precio de entrada y probabilidad de venta.',
    }
  }

  if (trend.metric === 'visitsCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning')) {
    return {
      ...base,
      id: 'temporal.decision.visits',
      title: 'Recuperar actividad de visitas',
      rationale: trend.summary,
      action: 'Cruzar propiedades publicadas, requerimientos activos y agenda de agentes para identificar stock sin visitas y demanda sin asignación.',
      priority: trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Aumentar contacto efectivo entre demanda e inventario disponible.',
      guardrail: 'No medir actividad únicamente por visitas agendadas; validar también visitas realizadas y calidad del seguimiento.',
    }
  }

  if (trend.metric === 'realizedVisitsCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning')) {
    return {
      ...base,
      id: 'temporal.decision.realized-visits',
      title: 'Reducir pérdida entre agenda y visita realizada',
      rationale: trend.summary,
      action: 'Revisar cancelaciones, confirmaciones y tiempos de respuesta por agente; establecer recordatorios y protocolo de reconfirmación.',
      priority: trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Mejorar la conversión de agenda a actividad comercial efectiva.',
      guardrail: 'No atribuir la caída exclusivamente al agente sin revisar disponibilidad, calidad del lead y condiciones de la propiedad.',
    }
  }

  if (trend.metric === 'stockCount' && (trend.signalLevel === 'critical' || trend.signalLevel === 'warning' || trend.anomaly)) {
    return {
      ...base,
      id: 'temporal.decision.stock',
      title: 'Revisar equilibrio de stock y rotación',
      rationale: trend.summary,
      action: 'Segmentar stock por antigüedad, zona, precio y actividad; identificar propiedades sin visitas, con precio fuera de mercado o con baja probabilidad de cierre.',
      priority: trend.anomaly || trend.signalLevel === 'critical' ? 'high' : 'medium',
      expectedOutcome: 'Distinguir crecimiento saludable de inventario de acumulación improductiva.',
      guardrail: 'No asumir que mayor stock es positivo ni que menor stock es negativo sin medir absorción y velocidad de venta.',
    }
  }

  if (trend.anomaly) {
    return {
      ...base,
      id: `temporal.decision.anomaly.${trend.metric}`,
      title: `Validar anomalía en ${trend.label.toLowerCase()}`,
      rationale: trend.summary,
      action: 'Validar integridad de la fuente, definición del KPI y consistencia del corte antes de adoptar una decisión operativa.',
      priority: 'high',
      expectedOutcome: 'Evitar decisiones basadas en errores de carga, cambios de universo o valores atípicos no explicados.',
      guardrail: 'No automatizar acciones irreversibles mientras la anomalía no esté validada por una persona responsable.',
    }
  }

  return null
}

export function buildTemporalDecisionRecommendations() {
  const snapshot = getExecutiveTemporalSnapshot()
  return snapshot.trends
    .map(recommendationForTrend)
    .filter((recommendation): recommendation is TemporalDecisionRecommendation => recommendation !== null)
    .sort((left, right) => {
      const rank: Record<TemporalDecisionPriority, number> = { high: 0, medium: 1, low: 2 }
      return rank[left.priority] - rank[right.priority]
    })
}
