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

type ValuationCase = {
  id: string
  status: string | null
  valuation_date: string | null
  address: string | null
  neighborhood: string | null
  estimated_value_uf: number | null
  confidence: string | null
  updated_at: string | null
}

type ManagementTask = {
  id: string
  title: string
  detail: string | null
  severity: string | null
  status: string | null
  priority: string | null
  office: string | null
  due_date: string | null
  updated_at: string | null
  sourceContext?: { kind: string; valuationId?: string | null; address?: string | null } | null
}

type PropertyAttention = {
  assignmentId: string
  propertyId: string | null
  address: string | null
  propertyType: string | null
  identityStatus: string | null
  lastSeenAt: string | null
  needsIdentityReview: boolean
  needsFreshnessReview: boolean
}

type PropertyContext = {
  scope: string
  totalAssignments: number
  confirmedIdentity: number
  pendingIdentity: number
  staleAssignments: number
  attention: PropertyAttention[]
  generatedAt: string
  mode: string
  writesPerformed: number
}

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties'
}

type Coverage = {
  management: { available: boolean; entities: number; alerts: number }
  tasks: { available: boolean; total: number; active: number; overdue: number }
  valuations: { available: boolean; total: number; review: number; drafts: number; approved: number }
  properties: { available: boolean; total: number; pendingIdentity: number; stale: number; attention: number }
}

type PedroPabloResponse = {
  answer: string
  title: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  actions: Array<{ label: string; href: string }>
  coverage: Coverage
  decisionPolicy: string
}

type ContextPack = {
  summary: ManagementSummary
  valuations: ValuationCase[]
  tasks: ManagementTask[]
  properties: PropertyContext | null
  coverage: Coverage
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
    domain: 'management',
  }
}

function topRiskMetrics(entities: Entity[]) {
  return entities
    .flatMap((entity) => entity.metrics.map((metric) => ({ entity, metric })))
    .filter(({ metric }) => metric.value !== null && metric.compliance !== null && metric.compliance !== undefined)
    .sort((a, b) => (a.metric.compliance ?? 999) - (b.metric.compliance ?? 999))
    .slice(0, 5)
}

function isActiveTask(task: ManagementTask) {
  return task.status === 'open' || task.status === 'in_progress'
}

function isOverdueTask(task: ManagementTask, today: string) {
  return isActiveTask(task) && Boolean(task.due_date && task.due_date < today)
}

function taskPriorityRank(task: ManagementTask, today: string) {
  if (isOverdueTask(task, today)) return 0
  if (task.priority === 'urgent') return 1
  if (task.severity === 'critical') return 2
  if (task.priority === 'high') return 3
  return 4
}

function valuationStatusLabel(status: string | null) {
  if (status === 'review') return 'en revisión'
  if (status === 'draft') return 'en borrador'
  if (status === 'approved') return 'aprobada'
  if (status === 'issued') return 'emitida'
  return status || 'sin estado'
}

function propertyAttentionReason(item: PropertyAttention) {
  const reasons: string[] = []
  if (item.needsIdentityReview) reasons.push('identidad pendiente')
  if (item.needsFreshnessReview) reasons.push('vigencia por verificar')
  return reasons.join(' y ') || 'requiere revisión'
}

function buildCoverage(
  summary: ManagementSummary,
  tasks: ManagementTask[] | null,
  valuations: ValuationCase[] | null,
  properties: PropertyContext | null,
): Coverage {
  const today = new Date().toISOString().slice(0, 10)
  const safeTasks = tasks ?? []
  const safeValuations = valuations ?? []
  return {
    management: {
      available: true,
      entities: summary.entities.length,
      alerts: summary.alerts.length,
    },
    tasks: {
      available: tasks !== null,
      total: safeTasks.length,
      active: safeTasks.filter(isActiveTask).length,
      overdue: safeTasks.filter((task) => isOverdueTask(task, today)).length,
    },
    valuations: {
      available: valuations !== null,
      total: safeValuations.length,
      review: safeValuations.filter((item) => item.status === 'review').length,
      drafts: safeValuations.filter((item) => item.status === 'draft').length,
      approved: safeValuations.filter((item) => item.status === 'approved' || item.status === 'issued').length,
    },
    properties: {
      available: properties !== null,
      total: properties?.totalAssignments ?? 0,
      pendingIdentity: properties?.pendingIdentity ?? 0,
      stale: properties?.staleAssignments ?? 0,
      attention: properties?.attention.length ?? 0,
    },
  }
}

function baseResponse(context: ContextPack) {
  return {
    scopeLabel: context.summary.scopeLabel,
    periodLabel: context.summary.periodLabel,
    confidence: 'high' as const,
    coverage: context.coverage,
    decisionPolicy: 'pedro-pablo-prioritization-v2 · evidencia autorizada > tareas vencidas/urgentes > valorizaciones en revisión > cartera con identidad/vigencia pendiente > brechas de cumplimiento',
  }
}

function answerPriorities(context: ContextPack): PedroPabloResponse {
  const { summary, tasks, valuations, properties } = context
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  const evidence: Evidence[] = []
  const actions: Array<{ label: string; href: string }> = []

  const alerts = summary.alerts.slice(0, 3)
  for (const alert of alerts) {
    lines.push(`${lines.length + 1}. ${alert.entityName}: ${alert.title}. ${alert.detail}`)
  }
  if (alerts.length) {
    evidence.push({ label: 'Alertas operativas', source: 'Resumen de gestión autorizado', cutoff: summary.generatedAt, domain: 'management' })
    actions.push({ label: 'Abrir control de gestión', href: '/dashboard/control/operations' })
  }

  const activeTasks = tasks
    .filter(isActiveTask)
    .sort((a, b) => taskPriorityRank(a, today) - taskPriorityRank(b, today))
    .slice(0, Math.max(0, 5 - lines.length))
  for (const task of activeTasks) {
    const due = task.due_date ? ` Vence ${task.due_date}${isOverdueTask(task, today) ? ' y está atrasada' : ''}.` : ''
    lines.push(`${lines.length + 1}. Tarea: ${task.title}.${due}`)
  }
  if (activeTasks.length) {
    evidence.push({ label: 'Tareas operativas', source: 'management_tasks · alcance autorizado', cutoff: new Date().toISOString(), domain: 'tasks' })
    actions.push({ label: 'Revisar tareas', href: '/dashboard/control/operations' })
  }

  const reviewCases = valuations
    .filter((item) => item.status === 'review')
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    .slice(0, Math.max(0, 5 - lines.length))
  for (const item of reviewCases) {
    lines.push(`${lines.length + 1}. Valorización en revisión: ${item.address || item.neighborhood || item.id}.`)
  }
  if (reviewCases.length) {
    evidence.push({ label: 'Valorizaciones en revisión', source: 'valuation_cases · alcance autorizado', cutoff: new Date().toISOString(), domain: 'valuations' })
    actions.push({ label: 'Revisar valorizaciones', href: '/dashboard/valuations' })
  }

  const propertyAttention = properties?.attention.slice(0, Math.max(0, 5 - lines.length)) ?? []
  for (const item of propertyAttention) {
    lines.push(`${lines.length + 1}. Propiedad: ${item.address || item.propertyId || item.assignmentId} · ${propertyAttentionReason(item)}.`)
  }
  if (propertyAttention.length && properties) {
    evidence.push({ label: 'Cartera que requiere revisión', source: 'property_assignments + market_properties · alcance autorizado', cutoff: properties.generatedAt, domain: 'properties' })
    actions.push({ label: 'Revisar cartera', href: '/dashboard/properties' })
  }

  if (lines.length < 5) {
    const risks = topRiskMetrics(summary.entities).slice(0, 5 - lines.length)
    for (const { entity, metric } of risks) {
      lines.push(`${lines.length + 1}. ${entity.name}: ${metric.label} en ${format(metric.compliance)}% de cumplimiento.`)
      evidence.push(evidenceFromMetric(metric))
    }
    if (risks.length && !actions.some((item) => item.href === '/dashboard/control/operations')) {
      actions.push({ label: 'Abrir control de gestión', href: '/dashboard/control/operations' })
    }
  }

  if (!lines.length) {
    return {
      ...baseResponse(context),
      title: 'Sin prioridades evaluables',
      answer: 'No hay alertas, tareas activas, valorizaciones en revisión, propiedades con atención pendiente ni métricas con cumplimiento evaluable dentro de tu alcance actual. Pedro Pablo no completará vacíos con supuestos.',
      evidence: [{ label: 'Cobertura actual', source: summary.dataProvenance, cutoff: summary.generatedAt, domain: 'management' }],
      actions: [{ label: 'Revisar datos disponibles', href: '/dashboard/control/operations' }],
    }
  }

  return {
    ...baseResponse(context),
    title: 'Prioridades operativas',
    answer: lines.join('\n'),
    evidence: evidence.slice(0, 8),
    actions: Array.from(new Map(actions.map((item) => [item.href, item])).values()),
  }
}

function answerTasks(context: ContextPack): PedroPabloResponse {
  const today = new Date().toISOString().slice(0, 10)
  const tasks = context.tasks
    .filter(isActiveTask)
    .sort((a, b) => taskPriorityRank(a, today) - taskPriorityRank(b, today))

  if (!context.coverage.tasks.available) {
    return {
      ...baseResponse(context),
      title: 'Tareas no disponibles',
      answer: 'Tu rol actual no expone el módulo de tareas a Pedro Pablo. No se infiere actividad fuera de ese alcance.',
      evidence: [],
      actions: [],
    }
  }

  if (!tasks.length) {
    return {
      ...baseResponse(context),
      title: 'Sin tareas activas',
      answer: 'No hay tareas abiertas o en progreso dentro de tu alcance actual.',
      evidence: [{ label: 'Tareas operativas', source: 'management_tasks · alcance autorizado', cutoff: new Date().toISOString(), domain: 'tasks' }],
      actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
    }
  }

  return {
    ...baseResponse(context),
    title: 'Tareas que requieren seguimiento',
    answer: tasks.slice(0, 8).map((task, index) => {
      const due = task.due_date ? ` · ${isOverdueTask(task, today) ? 'atrasada' : 'vence'} ${task.due_date}` : ''
      const priority = task.priority ? ` · prioridad ${task.priority}` : ''
      return `${index + 1}. ${task.title}${priority}${due}.`
    }).join('\n'),
    evidence: [{ label: 'Tareas operativas', source: 'management_tasks · alcance autorizado', cutoff: new Date().toISOString(), domain: 'tasks' }],
    actions: [{ label: 'Abrir tareas', href: '/dashboard/control/operations' }],
  }
}

function answerValuations(context: ContextPack): PedroPabloResponse {
  if (!context.coverage.valuations.available) {
    return {
      ...baseResponse(context),
      title: 'Valorizaciones no disponibles',
      answer: 'Tu rol actual no expone valorizaciones a Pedro Pablo. No se infieren casos fuera de ese alcance.',
      evidence: [],
      actions: [],
    }
  }

  if (!context.valuations.length) {
    return {
      ...baseResponse(context),
      title: 'Sin valorizaciones visibles',
      answer: 'No hay casos de valorización dentro de tu alcance actual.',
      evidence: [{ label: 'Valorizaciones', source: 'valuation_cases · alcance autorizado', cutoff: new Date().toISOString(), domain: 'valuations' }],
      actions: [{ label: 'Abrir valorizaciones', href: '/dashboard/valuations' }],
    }
  }

  const cases = [...context.valuations].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))).slice(0, 8)
  return {
    ...baseResponse(context),
    title: 'Estado de valorizaciones',
    answer: cases.map((item, index) => {
      const value = item.estimated_value_uf !== null ? ` · ${format(item.estimated_value_uf)} UF` : ''
      const confidence = item.confidence ? ` · confianza ${item.confidence}` : ''
      return `${index + 1}. ${item.address || item.neighborhood || item.id} · ${valuationStatusLabel(item.status)}${value}${confidence}.`
    }).join('\n'),
    evidence: [{ label: 'Casos de valorización', source: 'valuation_cases · alcance autorizado', cutoff: new Date().toISOString(), domain: 'valuations' }],
    actions: [{ label: 'Abrir valorizaciones', href: '/dashboard/valuations' }],
  }
}

function answerProperties(context: ContextPack): PedroPabloResponse {
  const properties = context.properties
  if (!properties) {
    return {
      ...baseResponse(context),
      title: 'Cartera no disponible',
      answer: 'Tu rol actual no expone la cartera a Pedro Pablo o la consulta no pudo completarse. No se infieren propiedades fuera de ese alcance.',
      evidence: [],
      actions: [],
    }
  }

  if (!properties.totalAssignments) {
    return {
      ...baseResponse(context),
      title: 'Sin propiedades asignadas',
      answer: 'No hay asignaciones activas de propiedades dentro de tu alcance actual.',
      evidence: [{ label: 'Cartera operacional', source: 'property_assignments + market_properties · alcance autorizado', cutoff: properties.generatedAt, domain: 'properties' }],
      actions: [{ label: 'Abrir propiedades', href: '/dashboard/properties' }],
    }
  }

  if (!properties.attention.length) {
    return {
      ...baseResponse(context),
      title: 'Cartera sin alertas de identidad o vigencia',
      answer: `${properties.totalAssignments} asignaciones activas visibles. ${properties.confirmedIdentity} tienen identidad confirmada y no hay propiedades marcadas por identidad pendiente o evidencia anterior a siete días.`,
      evidence: [{ label: 'Cartera operacional', source: 'property_assignments + market_properties · alcance autorizado', cutoff: properties.generatedAt, domain: 'properties' }],
      actions: [{ label: 'Abrir propiedades', href: '/dashboard/properties' }],
    }
  }

  const lines = properties.attention.slice(0, 8).map((item, index) => {
    const observed = item.lastSeenAt ? ` · última evidencia ${item.lastSeenAt}` : ' · sin fecha de evidencia'
    return `${index + 1}. ${item.address || item.propertyId || item.assignmentId} · ${propertyAttentionReason(item)}${observed}.`
  })

  return {
    ...baseResponse(context),
    title: 'Propiedades que requieren atención',
    answer: lines.join('\n'),
    evidence: [{ label: 'Cartera que requiere revisión', source: 'property_assignments + market_properties · alcance autorizado', cutoff: properties.generatedAt, domain: 'properties' }],
    actions: [{ label: 'Revisar cartera', href: '/dashboard/properties' }],
  }
}

function answerEntity(context: ContextPack, prompt: string): PedroPabloResponse | null {
  const normalizedPrompt = normalize(prompt)
  const entity = context.summary.entities
    .filter((item) => normalize(item.name).length > 3)
    .sort((a, b) => b.name.length - a.name.length)
    .find((item) => normalizedPrompt.includes(normalize(item.name)))

  if (!entity) return null

  const relevant = entity.metrics
    .filter((metric) => metric.value !== null)
    .sort((a, b) => (a.compliance ?? 999) - (b.compliance ?? 999))
    .slice(0, 6)

  if (!relevant.length) {
    return {
      ...baseResponse(context),
      title: entity.name,
      answer: `Existe una entidad autorizada para ${entity.name}, pero no hay métricas canónicas disponibles para responder con precisión.`,
      evidence: [{ label: entity.name, source: context.summary.dataProvenance, cutoff: context.summary.generatedAt, domain: 'management' }],
      actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
    }
  }

  return {
    ...baseResponse(context),
    title: `Lectura operacional · ${entity.name}`,
    answer: relevant.map((metric) => {
      const target = metric.target !== null && metric.target !== undefined ? ` · meta ${format(metric.target)}` : ''
      const compliance = metric.compliance !== null && metric.compliance !== undefined ? ` · cumplimiento ${format(metric.compliance)}%` : ''
      return `${metric.label}: ${format(metric.value)}${target}${compliance}.`
    }).join('\n'),
    evidence: relevant.map(evidenceFromMetric),
    actions: [{ label: 'Abrir control de gestión', href: '/dashboard/control/operations' }],
  }
}

function answerPerformance(context: ContextPack): PedroPabloResponse {
  const risk = topRiskMetrics(context.summary.entities)
  if (!risk.length) return answerPriorities(context)

  return {
    ...baseResponse(context),
    title: 'Lectura de desempeño',
    answer: risk.map(({ entity, metric }, index) => `${index + 1}. ${entity.name} · ${metric.label}: ${format(metric.value)}${metric.compliance !== null && metric.compliance !== undefined ? ` (${format(metric.compliance)}% cumplimiento)` : ''}.`).join('\n'),
    evidence: risk.map(({ metric }) => evidenceFromMetric(metric)),
    actions: [{ label: 'Profundizar en gestión', href: '/dashboard/control/operations' }],
  }
}

function buildResponse(context: ContextPack, prompt: string): PedroPabloResponse {
  const entityAnswer = answerEntity(context, prompt)
  if (entityAnswer) return entityAnswer

  const normalized = normalize(prompt)
  if (normalized.includes('tarea') || normalized.includes('pendiente') || normalized.includes('venc')) return answerTasks(context)
  if (normalized.includes('valoriza') || normalized.includes('tasacion') || normalized.includes('tasar')) return answerValuations(context)
  if (normalized.includes('propiedad') || normalized.includes('cartera') || normalized.includes('inmueble') || normalized.includes('vigencia') || normalized.includes('identidad')) return answerProperties(context)
  if (normalized.includes('prior') || normalized.includes('atencion') || normalized.includes('hoy') || normalized.includes('urg')) return answerPriorities(context)
  if (normalized.includes('desempen') || normalized.includes('rendimiento') || normalized.includes('cumplimiento') || normalized.includes('como vamos') || normalized.includes('brecha')) return answerPerformance(context)
  return { ...answerPriorities(context), title: 'Lectura recomendada' }
}

async function optionalJson<T>(response: Response, key: string): Promise<T[] | null> {
  if (response.status === 401) throw new Error('UNAUTHORIZED')
  if (!response.ok) return null
  const payload = await response.json() as Record<string, unknown>
  return Array.isArray(payload[key]) ? payload[key] as T[] : []
}

async function optionalObject<T>(response: Response): Promise<T | null> {
  if (response.status === 401) throw new Error('UNAUTHORIZED')
  if (!response.ok) return null
  return await response.json() as T
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
  const requestHeaders = { cookie }
  const [summaryResponse, tasksResponse, valuationsResponse, propertiesResponse] = await Promise.all([
    fetch(new URL('/api/management/summary', request.url), { headers: requestHeaders, cache: 'no-store' }),
    fetch(new URL('/api/management/tasks', request.url), { headers: requestHeaders, cache: 'no-store' }),
    fetch(new URL('/api/valuations/cases', request.url), { headers: requestHeaders, cache: 'no-store' }),
    fetch(new URL('/api/pedro-pablo/properties', request.url), { headers: requestHeaders, cache: 'no-store' }),
  ])

  if (!summaryResponse.ok) {
    const status = summaryResponse.status === 401 || summaryResponse.status === 403 ? summaryResponse.status : 502
    return NextResponse.json({ error: status === 502 ? 'No fue posible consultar la inteligencia autorizada.' : 'No autorizado.' }, { status })
  }

  try {
    const summary = await summaryResponse.json() as ManagementSummary
    const [tasks, valuations, properties] = await Promise.all([
      optionalJson<ManagementTask>(tasksResponse, 'tasks'),
      optionalJson<ValuationCase>(valuationsResponse, 'cases'),
      optionalObject<PropertyContext>(propertiesResponse),
    ])
    const context: ContextPack = {
      summary,
      tasks: tasks ?? [],
      valuations: valuations ?? [],
      properties,
      coverage: buildCoverage(summary, tasks, valuations, properties),
    }
    const response = buildResponse(context, prompt)

    return NextResponse.json({
      ...response,
      mode: 'canonical-operating-agent',
      writesPerformed: 0,
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }
    console.error('[pedro-pablo] context composition failed')
    return NextResponse.json({ error: 'No fue posible componer la inteligencia operativa.' }, { status: 502 })
  }
}
