import { NextRequest, NextResponse } from 'next/server'

type Metric = {
  code: string
  label: string
  value: number | null
  target?: number | null
  compliance?: number | null
  sourceName?: string
  sourceReference?: string
  periodEnd?: string
  qualityStatus?: string
}

type Entity = {
  id: string
  name: string
  entityType: 'company' | 'branch' | 'partner'
  metrics: Metric[]
}

type Alert = {
  id: string
  severity: 'critical' | 'warning'
  title: string
  detail: string
  entityName: string
  createdAt: string
}

type ManagementSummary = {
  role: string
  scopeLabel: string
  entities: Entity[]
  alerts: Alert[]
  periodLabel: string
  generatedAt: string
  dataProvenance: string
}

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
}

type PedroPabloResponse = {
  answer: string
  title: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  actions: Array<{ label: string; href: string }>
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const format = (value: number | null | undefined) =>
  value === null || value === undefined ? 'sin dato' : value.toLocaleString('es-CL', { maximumFractionDigits: 1 })

function evidenceFromMetric(metric: Metric): Evidence {
  return {
    label: metric.label,
    source: metric.sourceName || 'Fuente canónica de gestión',
    reference: metric.sourceReference ?? null,
    cutoff: metric.periodEnd ?? null,
  }
}

function topRiskMetrics(entities: Entity[]) {
  return entities
    .flatMap((entity) => entity.metrics.map((metric) => ({ entity, metric })))
    .filter(({ metric }) => metric.value !== null && metric.compliance !== null && metric.compliance !== undefined)
    .sort((a, b) => (a.metric.compliance ?? 999) - (b.metric.compliance ?? 999))
    .slice(0, 5)
}

function answerPriorities(summary: ManagementSummary): PedroPabloResponse {
  if (summary.alerts.length) {
    const alerts = summary.alerts.slice(0, 5)
    return {
      title: 'Prioridades que requieren atención',
      answer: alerts.map((alert, index) => `${index + 1}. ${alert.entityName}: ${alert.title}. ${alert.detail}`).join('\n'),
      scopeLabel: summary.scopeLabel,
      periodLabel: summary.periodLabel,
      confidence: 'high',
      evidence: [{ label: 'Alertas operativas', source: 'Resumen de gestión autorizado', cutoff: summary.generatedAt }],
      actions: [
        { label: 'Abrir control de gestión', href: '/dashboard/control/operations' },
        { label: 'Revisar valorizaciones', href: '/dashboard/valuations' },
      ],
    }
  }

  const risks = topRiskMetrics(summary.entities)
  if (risks.length) {
    return {
      title: 'Prioridades según cumplimiento disponible',
      answer: risks.map(({ entity, metric }, index) => `${index + 1}. ${entity.name}: ${metric.label} en ${format(metric.compliance)}% de cumplimiento.`).join('\n'),
      scopeLabel: summary.scopeLabel,
      periodLabel: summary.periodLabel,
      confidence: 'high',
      evidence: risks.map(({ metric }) => evidenceFromMetric(metric)),
      actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
    }
  }

  return {
    title: 'Sin prioridades evaluables',
    answer: 'No hay alertas ni métricas con cumplimiento evaluable dentro de tu alcance actual. Pedro Pablo no completará vacíos con supuestos.',
    scopeLabel: summary.scopeLabel,
    periodLabel: summary.periodLabel,
    confidence: 'high',
    evidence: [{ label: 'Cobertura actual', source: summary.dataProvenance, cutoff: summary.generatedAt }],
    actions: [{ label: 'Revisar datos disponibles', href: '/dashboard/control/operations' }],
  }
}

function answerEntity(summary: ManagementSummary, prompt: string): PedroPabloResponse | null {
  const normalizedPrompt = normalize(prompt)
  const entity = summary.entities
    .filter((item) => normalize(item.name).length > 3)
    .sort((a, b) => b.name.length - a.name.length)
    .find((item) => normalizedPrompt.includes(normalize(item.name)))

  if (!entity) return null

  const relevant = entity.metrics
    .filter((metric) => metric.value !== null)
    .sort((a, b) => {
      const aScore = a.compliance ?? 999
      const bScore = b.compliance ?? 999
      return aScore - bScore
    })
    .slice(0, 6)

  if (!relevant.length) {
    return {
      title: entity.name,
      answer: `Existe una entidad autorizada para ${entity.name}, pero no hay métricas canónicas disponibles para responder con precisión.`,
      scopeLabel: summary.scopeLabel,
      periodLabel: summary.periodLabel,
      confidence: 'high',
      evidence: [{ label: entity.name, source: summary.dataProvenance, cutoff: summary.generatedAt }],
      actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
    }
  }

  return {
    title: `Lectura operacional · ${entity.name}`,
    answer: relevant.map((metric) => {
      const target = metric.target !== null && metric.target !== undefined ? ` · meta ${format(metric.target)}` : ''
      const compliance = metric.compliance !== null && metric.compliance !== undefined ? ` · cumplimiento ${format(metric.compliance)}%` : ''
      return `${metric.label}: ${format(metric.value)}${target}${compliance}.`
    }).join('\n'),
    scopeLabel: summary.scopeLabel,
    periodLabel: summary.periodLabel,
    confidence: 'high',
    evidence: relevant.map(evidenceFromMetric),
    actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
  }
}

function answerPerformance(summary: ManagementSummary): PedroPabloResponse {
  const risk = topRiskMetrics(summary.entities)
  if (!risk.length) return answerPriorities(summary)

  return {
    title: 'Lectura de desempeño',
    answer: risk.map(({ entity, metric }, index) => `${index + 1}. ${entity.name} · ${metric.label}: ${format(metric.value)}${metric.compliance !== null && metric.compliance !== undefined ? ` (${format(metric.compliance)}% cumplimiento)` : ''}.`).join('\n'),
    scopeLabel: summary.scopeLabel,
    periodLabel: summary.periodLabel,
    confidence: 'high',
    evidence: risk.map(({ metric }) => evidenceFromMetric(metric)),
    actions: [{ label: 'Profundizar en gestión', href: '/dashboard/control/operations' }],
  }
}

function buildResponse(summary: ManagementSummary, prompt: string): PedroPabloResponse {
  const entityAnswer = answerEntity(summary, prompt)
  if (entityAnswer) return entityAnswer

  const normalized = normalize(prompt)
  if (normalized.includes('prior') || normalized.includes('atencion') || normalized.includes('hoy') || normalized.includes('urg')) {
    return answerPriorities(summary)
  }
  if (normalized.includes('desempen') || normalized.includes('rendimiento') || normalized.includes('cumplimiento') || normalized.includes('como vamos')) {
    return answerPerformance(summary)
  }

  return {
    ...answerPriorities(summary),
    title: 'Lectura recomendada',
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const prompt = typeof (body as { prompt?: unknown })?.prompt === 'string' ? (body as { prompt: string }).prompt.trim() : ''
  if (!prompt || prompt.length > 800) {
    return NextResponse.json({ error: 'La consulta debe contener entre 1 y 800 caracteres.' }, { status: 400 })
  }

  const cookie = request.headers.get('cookie') ?? ''
  const summaryResponse = await fetch(new URL('/api/management/summary', request.url), {
    headers: { cookie },
    cache: 'no-store',
  })

  if (!summaryResponse.ok) {
    const status = summaryResponse.status === 401 || summaryResponse.status === 403 ? summaryResponse.status : 502
    return NextResponse.json({ error: status === 502 ? 'No fue posible consultar la inteligencia autorizada.' : 'No autorizado.' }, { status })
  }

  const summary = await summaryResponse.json() as ManagementSummary
  const response = buildResponse(summary, prompt)

  return NextResponse.json({
    ...response,
    mode: 'canonical-governed',
    writesPerformed: 0,
    generatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
