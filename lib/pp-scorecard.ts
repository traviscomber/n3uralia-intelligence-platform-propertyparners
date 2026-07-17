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
      note: 'Protege confianza ejecutiva y evita decisiones sobre inventario sucio.',
    },
    {
      id: 'market-signal',
      label: 'Señal de mercado',
      formula: '0.40*absorption + 0.30*velocity + 0.30*inventory-balance',
      threshold: 'Good >= 80, warning 60-79, critical < 60',
      owner: 'Market intelligence',
      cadence: 'Weekly',
      direction: 'higher',
      target: 80,
      warning: 60,
      note: 'Resume si Vitacura empuja o frena la estrategia comercial.',
    },
    {
      id: 'forecast-discipline',
      label: 'Disciplina de forecast',
      formula: '1 - abs(forecast-actual)/actual',
      threshold: 'Good >= 80, warning 60-79, critical < 60',
      owner: 'CEO',
      cadence: 'Monthly',
      direction: 'higher',
      target: 80,
      warning: 60,
      note: 'Mide si el plan es confiable para asignar recursos.',
    },
  ],
  director: [
    {
      id: 'team-conversion',
      label: 'Conversión de equipo',
      formula: 'closed / conversations',
      threshold: 'Good >= 70, warning 50-69, critical < 50',
      owner: 'Director',
      cadence: 'Weekly',
      direction: 'higher',
      target: 70,
      warning: 50,
      note: 'Mide la capacidad del equipo para transformar actividad en ventas.',
    },
    {
      id: 'pipeline-coverage',
      label: 'Cobertura de pipeline',
      formula: 'weighted pipeline / weekly target',
      threshold: 'Good >= 300, warning 200-299, critical < 200',
      owner: 'Director',
      cadence: 'Weekly',
      direction: 'higher',
      target: 300,
      warning: 200,
      note: 'Evita semanas sin suficiente tubo comercial.',
    },
    {
      id: 'followup-completion',
      label: 'Cumplimiento de seguimiento',
      formula: 'completed follow-ups / planned follow-ups',
      threshold: 'Good >= 90, warning 75-89, critical < 75',
      owner: 'Director',
      cadence: 'Daily / weekly',
      direction: 'higher',
      target: 90,
      warning: 75,
      note: 'Protege la cadencia comercial y el control del equipo.',
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

