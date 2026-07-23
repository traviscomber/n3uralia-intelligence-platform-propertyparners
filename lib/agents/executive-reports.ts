import { createClient } from '@/lib/supabase/server'
import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'

type Audience = 'ceo' | 'director' | 'partner'
type ReportPeriod = 'weekly' | 'monthly' | 'custom'

type ExecutiveReportInput = {
  audience: Audience
  periodType?: ReportPeriod
  dateFrom?: string
  dateTo?: string
  directorId?: string
  title?: string
}

type ApprovedFinding = {
  id: string
  run_id: string
  finding_type: string
  title: string
  summary: string
  severity: 'info' | 'opportunity' | 'warning' | 'critical'
  confidence: number | string | null
  evidence: unknown
  dimensions: Record<string, unknown> | null
  approved_at: string | null
  created_at: string
  agent_runs: { agent_key: string; title: string; created_at: string } | null
}

type WeeklyReportRow = {
  id: number
  report_key: string
  report_scope: string
  week_start: string
  week_end: string
  director_id: string | null
  sales_count: number
  commission_total: number | string
  conversion_rate: number | string
  target_progress: number
  velocity_change: number | string
  status: string
  content: Record<string, unknown> | null
  generated_at: string
}

const severityWeight = { critical: 4, warning: 3, opportunity: 2, info: 1 } as const

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function periodBounds(input: ExecutiveReportInput) {
  const now = new Date()
  if (input.dateFrom || input.dateTo) {
    return {
      from: input.dateFrom ? new Date(`${input.dateFrom}T00:00:00`) : new Date(now.getTime() - 30 * 86_400_000),
      to: input.dateTo ? new Date(`${input.dateTo}T23:59:59.999`) : now,
    }
  }

  if (input.periodType === 'monthly') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }

  return { from: new Date(now.getTime() - 7 * 86_400_000), to: now }
}

function audienceLabel(audience: Audience) {
  if (audience === 'ceo') return 'CEO'
  if (audience === 'director') return 'Dirección'
  return 'Ejecutivos / Partners'
}

function buildHeadline(findings: ApprovedFinding[], weekly: WeeklyReportRow[]) {
  const critical = findings.filter((finding) => finding.severity === 'critical').length
  const warnings = findings.filter((finding) => finding.severity === 'warning').length
  const opportunities = findings.filter((finding) => finding.severity === 'opportunity').length
  const latest = weekly[0]

  if (critical > 0) return `${critical} alerta${critical === 1 ? '' : 's'} crítica${critical === 1 ? '' : 's'} requieren decisión ejecutiva.`
  if (latest?.status === 'behind') return 'El desempeño comercial está bajo objetivo y requiere medidas correctivas.'
  if (opportunities > warnings) return 'La evidencia aprobada muestra más oportunidades que riesgos en el período.'
  if (warnings > 0) return `${warnings} señal${warnings === 1 ? '' : 'es'} de atención deben ser gestionadas durante el próximo ciclo.`
  return 'La operación se mantiene estable con evidencia aprobada y sin alertas críticas.'
}

function recommendationFor(finding: ApprovedFinding) {
  const title = finding.title.toLowerCase()
  if (finding.severity === 'critical') return `Asignar responsable y plazo inmediato para: ${finding.title}.`
  if (finding.finding_type.includes('valuation') || title.includes('uf/m²')) return `Revisar la evidencia comparable y aprobar o ajustar la valorización asociada a “${finding.title}”.`
  if (title.includes('inventario')) return `Revisar estrategia de captación, precio y exposición en el segmento afectado.`
  if (title.includes('días') || title.includes('publicación')) return `Identificar propiedades con baja velocidad y definir acciones comerciales específicas.`
  if (finding.severity === 'opportunity') return `Convertir “${finding.title}” en una acción comercial con responsable y seguimiento.`
  return `Mantener seguimiento de “${finding.title}” y actualizar su evidencia en la próxima ejecución.`
}

export async function buildExecutiveReport(input: ExecutiveReportInput) {
  const supabase = await createClient()
  const { from, to } = periodBounds(input)

  let findingsQuery = supabase
    .from('agent_findings')
    .select('id,run_id,finding_type,title,summary,severity,confidence,evidence,dimensions,approved_at,created_at,agent_runs(agent_key,title,created_at)')
    .eq('approval_status', 'approved')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: findingsData, error: findingsError } = await findingsQuery
  if (findingsError) throw findingsError

  let weeklyQuery = supabase
    .from('weekly_reports')
    .select('id,report_key,report_scope,week_start,week_end,director_id,sales_count,commission_total,conversion_rate,target_progress,velocity_change,status,content,generated_at')
    .gte('generated_at', from.toISOString())
    .lte('generated_at', to.toISOString())
    .order('generated_at', { ascending: false })
    .limit(24)

  if (input.directorId) weeklyQuery = weeklyQuery.eq('director_id', input.directorId)
  const { data: weeklyData, error: weeklyError } = await weeklyQuery
  if (weeklyError) throw weeklyError

  const findings = ((findingsData || []) as unknown as ApprovedFinding[])
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity] || b.created_at.localeCompare(a.created_at))
  const weekly = (weeklyData || []) as WeeklyReportRow[]

  const marketFindings = findings.filter((finding) => finding.agent_runs?.agent_key === 'market_intelligence')
  const valuationFindings = findings.filter((finding) => finding.agent_runs?.agent_key === 'valuation')
  const critical = findings.filter((finding) => finding.severity === 'critical')
  const warnings = findings.filter((finding) => finding.severity === 'warning')
  const opportunities = findings.filter((finding) => finding.severity === 'opportunity')

  const latestWeekly = weekly[0]
  const confidenceValues = findings.map((finding) => numeric(finding.confidence)).filter((value) => value > 0)
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0.35
  const evidenceScore = Math.min(findings.length / 8, 1)
  const weeklyScore = weekly.length ? 1 : 0.4
  const reportConfidence = Math.max(0.2, Math.min(0.95, averageConfidence * 0.6 + evidenceScore * 0.25 + weeklyScore * 0.15))

  const priorities = findings.slice(0, 6).map((finding, index) => ({
    rank: index + 1,
    findingId: finding.id,
    severity: finding.severity,
    title: finding.title,
    context: finding.summary,
    recommendation: recommendationFor(finding),
    confidence: numeric(finding.confidence),
  }))

  const report = {
    title: input.title || `Reporte ejecutivo ${audienceLabel(input.audience)}`,
    audience: input.audience,
    period: { from: from.toISOString(), to: to.toISOString(), type: input.periodType || 'weekly' },
    generatedAt: new Date().toISOString(),
    executiveSummary: buildHeadline(findings, weekly),
    keyMetrics: {
      approvedFindings: findings.length,
      marketFindings: marketFindings.length,
      valuationFindings: valuationFindings.length,
      criticalAlerts: critical.length,
      warnings: warnings.length,
      opportunities: opportunities.length,
      latestSalesCount: latestWeekly?.sales_count ?? null,
      latestCommissionTotal: latestWeekly ? numeric(latestWeekly.commission_total) : null,
      latestConversionRate: latestWeekly ? numeric(latestWeekly.conversion_rate) : null,
      latestTargetProgress: latestWeekly?.target_progress ?? null,
      latestStatus: latestWeekly?.status ?? null,
    },
    priorities,
    marketSection: marketFindings.slice(0, input.audience === 'partner' ? 3 : 6).map((finding) => ({
      id: finding.id,
      title: finding.title,
      summary: finding.summary,
      severity: finding.severity,
      confidence: numeric(finding.confidence),
    })),
    valuationSection: valuationFindings.slice(0, input.audience === 'partner' ? 3 : 6).map((finding) => ({
      id: finding.id,
      title: finding.title,
      summary: finding.summary,
      severity: finding.severity,
      confidence: numeric(finding.confidence),
    })),
    managementSection: weekly.slice(0, input.audience === 'partner' ? 1 : 4).map((row) => ({
      reportKey: row.report_key,
      scope: row.report_scope,
      weekStart: row.week_start,
      weekEnd: row.week_end,
      directorId: row.director_id,
      salesCount: row.sales_count,
      commissionTotal: numeric(row.commission_total),
      conversionRate: numeric(row.conversion_rate),
      targetProgress: row.target_progress,
      velocityChange: numeric(row.velocity_change),
      status: row.status,
    })),
    nextActions: priorities.map((priority) => priority.recommendation),
    limitations: [
      findings.length ? null : 'No existen hallazgos aprobados para el período seleccionado.',
      weekly.length ? null : 'No existe un snapshot de gestión generado dentro del período.',
      'El reporte sintetiza información aprobada; no reemplaza validación directiva antes de distribución.',
    ].filter(Boolean),
  }

  const sources: AgentSourceInput[] = [
    ...findings.map((finding) => ({
      sourceType: 'approved_agent_finding',
      sourceName: finding.agent_runs?.title || finding.title,
      sourceTable: 'agent_findings',
      sourceRecordId: finding.id,
      observedAt: finding.approved_at || finding.created_at,
      freshnessStatus: 'current' as const,
      metadata: { agentKey: finding.agent_runs?.agent_key, severity: finding.severity, confidence: numeric(finding.confidence) },
    })),
    ...weekly.map((row) => ({
      sourceType: 'management_report',
      sourceName: row.report_key,
      sourceTable: 'weekly_reports',
      sourceRecordId: String(row.id),
      observedAt: row.generated_at,
      freshnessStatus: 'current' as const,
      metadata: { scope: row.report_scope, status: row.status, targetProgress: row.target_progress },
    })),
  ]

  const outputFindings: AgentFindingInput[] = []
  if (critical.length) {
    outputFindings.push({
      findingType: 'executive_critical_alerts',
      title: `${critical.length} alertas críticas en el reporte`,
      summary: critical.map((finding) => finding.title).join(' · '),
      severity: 'critical',
      confidence: reportConfidence,
      evidence: critical.map((finding) => finding.id),
      dimensions: { audience: input.audience, count: critical.length },
    })
  }
  if (latestWeekly?.status === 'behind') {
    outputFindings.push({
      findingType: 'management_below_target',
      title: 'Desempeño bajo objetivo',
      summary: `El último snapshot registra ${latestWeekly.target_progress}% de avance respecto de la meta.`,
      severity: 'warning',
      confidence: reportConfidence,
      evidence: [String(latestWeekly.id)],
      dimensions: { targetProgress: latestWeekly.target_progress, reportKey: latestWeekly.report_key },
    })
  }
  if (opportunities.length) {
    outputFindings.push({
      findingType: 'executive_opportunities',
      title: `${opportunities.length} oportunidades aprobadas`,
      summary: opportunities.slice(0, 4).map((finding) => finding.title).join(' · '),
      severity: 'opportunity',
      confidence: reportConfidence,
      evidence: opportunities.map((finding) => finding.id),
      dimensions: { audience: input.audience, count: opportunities.length },
    })
  }

  return {
    report,
    confidence: Math.round(reportConfidence * 10000) / 10000,
    sources,
    findings: outputFindings,
  }
}
