export type MonitoringAlert = {
  type: 'risk' | 'opportunity' | 'change'
  signal: string
  evidence: string[]
  confidence: number
  recommendation: string
}

export function monitorStrategicSignals(input: {
  changes: string[]
  risks: string[]
  opportunities: string[]
  confidence: number
}): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = []

  input.risks.forEach((risk) => {
    alerts.push({
      type: 'risk',
      signal: risk,
      evidence: input.changes,
      confidence: input.confidence,
      recommendation:
        'Review evidence and validate before strategic action.',
    })
  })

  input.opportunities.forEach((opportunity) => {
    alerts.push({
      type: 'opportunity',
      signal: opportunity,
      evidence: input.changes,
      confidence: input.confidence,
      recommendation:
        'Evaluate opportunity against strategy and available resources.',
    })
  })

  return alerts
}
