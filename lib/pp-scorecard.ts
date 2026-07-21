export type ScorecardDirection = 'higher' | 'lower'

export type ScorecardStatus = 'good' | 'warning' | 'critical' | 'inactive'

export type ScorecardMetricDefinition = {
  id: string
  label: string
  formula: string
  threshold: string
  owner: string
  cadence: string
  direction: ScorecardDirection
  target: number
  warning: number
  unit?: string
  note: string
}

export type ScorecardMetricState = {
  id: string
  label: string
  current: number | null
  unit?: string
  status: ScorecardStatus
  definition: ScorecardMetricDefinition
}

export type ScorecardRoleKey = 'ceo' | 'director' | 'seller'

export const PP_SCORECARD_DEFINITIONS: Record<ScorecardRoleKey, ScorecardMetricDefinition[]> = {
  ceo: [
    {
      id: 'data-quality',
      label: 'Calidad de datos',
      formula: '0.40*dedupe + 0.35*reliability + 0.25*completeness',
      threshold: 'Good >= 80, warning 60-79, critical < 60',
      owner: 'Data ops',
      cadence: 'Daily',
      direction: 'higher',
      target: 80,
      warning: 60,
      note: 'Mide datasets mensuales presentes sobre datasets esperados; las anomalias se reportan por separado.',
    },
    {
      id: 'stock-retention',
      label: 'Retención de cartera',
      formula: 'stock actual / stock primer corte comparable',
      threshold: 'Bueno >= 95%, alerta 90-94%, crítico < 90%',
      owner: 'Market intelligence',
      cadence: 'Weekly',
      direction: 'higher',
      target: 95,
      warning: 90,
      unit: '%',
      note: 'Advierte contracción de la oferta interna disponible en Vitacura.',
    },
    {
      id: 'forecast-discipline',
      label: 'Cumplimiento de metas',
      formula: 'resultado real / meta versionada',
      threshold: 'Se activa al integrar y validar Metas 2026',
      owner: 'CEO',
      cadence: 'Monthly',
      direction: 'higher',
      target: 80,
      warning: 60,
      note: 'Permanece inactivo para evitar inferir objetivos desde la actividad real.',
    },
  ],
  director: [
    {
      id: 'classification-coverage',
      label: 'Cobertura de clasificación',
      formula: '(clasificados + sin clasificar) / leads activos exportados',
      threshold: 'Bueno >= 95%, alerta 85-94%, crítico < 85%',
      owner: 'Director',
      cadence: 'Weekly',
      direction: 'higher',
      target: 95,
      warning: 85,
      unit: '%',
      note: 'Detecta leads activos ausentes de los estados de clasificación.',
    },
    {
      id: 'stale-lead-rate',
      label: 'Carga sin gestión >15d',
      formula: '(leads sin gestión 15-90 días + leads sobre 90 días) / leads activos',
      threshold: 'Bueno <= 10%, alerta 11-20%, crítico > 20%',
      owner: 'Director',
      cadence: 'Weekly',
      direction: 'lower',
      target: 10,
      warning: 20,
      unit: '%',
      note: 'Suma los dos archivos disjuntos de antigüedad para no subestimar la cola vencida.',
    },
    {
      id: 'suspension-pressure',
      label: 'Presión de suspensiones',
      formula: 'suspensiones del mes / stock publicado al cierre',
      threshold: 'Bueno <= 10%, alerta 11-15%, crítico > 15%',
      owner: 'Director',
      cadence: 'Daily / weekly',
      direction: 'lower',
      target: 10,
      warning: 15,
      unit: '%',
      note: 'Señala riesgo de pérdida de inventario y necesidad de intervención.',
    },
  ],
  seller: [
    {
      id: 'response-speed',
      label: 'Velocidad de respuesta',
      formula: 'lead arrival -> first contact minutes',
      threshold: 'Good <= 5 min, warning 6-30 min, critical > 30 min',
      owner: 'Seller',
      cadence: 'Daily',
      direction: 'lower',
      target: 5,
      warning: 30,
      unit: 'min',
      note: 'La velocidad temprana es uno de los principales determinantes de conversión.',
    },
    {
      id: 'playbook-adoption',
      label: 'Adopción del playbook',
      formula: 'useful feedback / total feedback',
      threshold: 'Good >= 60, warning 40-59, critical < 40',
      owner: 'Seller / Product',
      cadence: 'Weekly',
      direction: 'higher',
      target: 60,
      warning: 40,
      note: 'Mide si las recomendaciones realmente se usan.',
    },
    {
      id: 'insight-freshness',
      label: 'Frescura del insight',
      formula: 'now - last insight refresh',
      threshold: 'Good <= 24h, warning 24-72h, critical > 72h',
      owner: 'Ops',
      cadence: 'Daily',
      direction: 'lower',
      target: 24,
      warning: 72,
      unit: 'h',
      note: 'Mantiene el playbook alineado con Vitacura hoy, no con el mes pasado.',
    },
  ],
}

export function assessMetricStatus(value: number | null, definition: ScorecardMetricDefinition): ScorecardStatus {
  if (value === null || Number.isNaN(value)) return 'inactive'

  if (definition.direction === 'higher') {
    if (value >= definition.target) return 'good'
    if (value >= definition.warning) return 'warning'
    return 'critical'
  }

  if (value <= definition.target) return 'good'
  if (value <= definition.warning) return 'warning'
  return 'critical'
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
