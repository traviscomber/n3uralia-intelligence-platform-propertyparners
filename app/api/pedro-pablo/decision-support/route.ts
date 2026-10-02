import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { PEDRO_PABLO_EXECUTIVE_PROFILE } from '@/lib/pedro-pablo/executive-profile'
import { routePedroPabloPrompt } from '@/lib/pedro-pablo/agentic-router'
import { PEDRO_PABLO_ALIGNMENT_CONTRACT, PEDRO_PABLO_VITACURA_EXPERTISE, detectOutOfScopeMarket, expertiseCardsForPrompt } from '@/lib/pedro-pablo/vitacura-expertise'
import { getMarketOpportunityPulse, type MarketOpportunityPulse } from '@/lib/market-opportunity-intelligence'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties' | 'reports' | 'market'
}

type LegacyAction = { label: string; href: string }

type ValuationPageComparable = {
  id: string
  address: string | null
  source_type: string | null
  price_uf: number | null
  price_uf_m2: number | null
  similarity_score: number | null
  distance_meters: number | null
  selected: boolean
  match_status: string | null
  contradictions?: string[] | null
}

type ValuationPageContext = {
  valuationCase?: {
    id: string
    address: string | null
    neighborhood: string | null
    property_type: string | null
    estimated_value_uf: number | null
    confidence: string | null
    justification: string | null
    status: string | null
  }
  comparables?: ValuationPageComparable[]
  error?: string
}

type ValuationReviewContext = {
  evidence?: {
    selectedComparables?: number
    medianUfM2?: number | null
    contradictions?: number
  }
  reviewGate?: {
    mode?: string
    reasons?: string[]
  }
  error?: string
}

type BaseResponse = {
  title: string
  answer: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  actions: LegacyAction[]
  coverage: Record<string, unknown>
  decisionPolicy: string
  mode: string
  writesPerformed: number
  generatedAt: string
}

type ReportSummary = {
  total: number
  sent: number
  failed: number
  queued: number
  escalated: number
  recentSuccessRate: number
  lastSentAt: string | null
  latestCreatedAt: string | null
  byReportType: Array<{ report_type: string; count: number }>
}

type ReportContext = {
  available: boolean
  reason: 'role_scope' | 'source_unavailable' | null
  summary: ReportSummary | null
  generatedAt: string
  writesPerformed: 0
}

type ProposalPriority = 'critical' | 'high' | 'medium' | 'low'
type ProposalDomain = 'management' | 'tasks' | 'valuations' | 'properties' | 'reports' | 'market' | 'cross-domain'
type ProposalKind = 'review' | 'follow_up' | 'verify' | 'prepare'

type ActionProposal = {
  id: string
  kind: ProposalKind
  domain: ProposalDomain
  action: string
  objectLabel: string
  reason: string
  priority: ProposalPriority
  href: string
  requiresConfirmation: true
  executionStatus: 'proposed'
  evidence: Evidence[]
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function formatUf(value: number | null | undefined) {
  return value == null || !Number.isFinite(Number(value))
    ? 'sin valor disponible'
    : `UF ${Number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function valuationPageAnswer(
  base: BaseResponse,
  prompt: string,
  caseId: string,
  page: ValuationPageContext,
  review: ValuationReviewContext | null,
): BaseResponse | null {
  const valuation = page.valuationCase
  if (!valuation) return null

  const normalized = normalize(prompt)
  const isCurrentCaseQuestion = [
    'este valor', 'esta valoriz', 'este expediente', 'comparab', 'defendible',
    'antes de enviar', 'enviarla', 'enviarlo', 'alerta', 'revis', 'precio',
    'por que', 'porque', 'valor',
  ].some((term) => normalized.includes(term))
  if (!isCurrentCaseQuestion) return null

  const comparables = page.comparables ?? []
  const accepted = comparables.filter((item) => item.selected && item.match_status === 'accepted')
  const contradictionCount = accepted.reduce((total, item) => total + (item.contradictions?.length ?? 0), 0)
  const medianUfM2 = review?.evidence?.medianUfM2 ?? median(
    accepted.map((item) => Number(item.price_uf_m2)).filter((value) => Number.isFinite(value) && value > 0),
  )
  const topComparables = [...accepted]
    .sort((a, b) => Number(b.similarity_score ?? 0) - Number(a.similarity_score ?? 0))
    .slice(0, 3)

  const evidence: Evidence[] = [
    {
      label: 'Expediente de valorización actual',
      source: 'valuation_cases · alcance autorizado',
      reference: caseId,
      domain: 'valuations',
    },
    {
      label: 'Comparables seleccionados',
      source: 'valuation_comparables · alcance autorizado',
      reference: `${accepted.length} aceptados`,
      domain: 'valuations',
    },
  ]

  const asksComparables = normalized.includes('comparab')
  const asksReview = normalized.includes('antes de enviar') || normalized.includes('enviarla') || normalized.includes('enviarlo') || normalized.includes('alerta') || normalized.includes('revis')

  if (asksComparables) {
    const lines = topComparables.length
      ? topComparables.map((item, index) => {
          const rate = item.price_uf_m2 == null ? 'UF/m² no disponible' : `${Number(item.price_uf_m2).toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m²`
          const similarity = item.similarity_score == null ? 'coincidencia no disponible' : `${(Number(item.similarity_score) * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% coincidencia`
          return `${index + 1}. ${item.address || 'Dirección no disponible'} · ${formatUf(item.price_uf)} · ${rate} · ${similarity}.`
        })
      : ['No hay comparables aceptados suficientes para explicar este valor todavía.']

    return {
      ...base,
      title: 'Comparables que sostienen esta valorización',
      answer: lines.join('\n'),
      confidence: accepted.length >= 3 ? 'high' : 'medium',
      evidence,
      actions: [{ label: 'Abrir expediente', href: `/dashboard/valuations/${caseId}` }],
    }
  }

  if (asksReview) {
    const reasons = review?.reviewGate?.reasons ?? []
    const checks = [
      accepted.length >= 3
        ? `Muestra: ${accepted.length} comparables aceptados.`
        : `Muestra insuficiente: sólo ${accepted.length} comparables aceptados; se requieren al menos 3.`,
      contradictionCount === 0
        ? 'Evidencia: sin contradicciones en los comparables aceptados.'
        : `Evidencia: ${contradictionCount} contradicción${contradictionCount === 1 ? '' : 'es'} por resolver.`,
      valuation.justification?.trim()
        ? 'Justificación profesional: registrada.'
        : 'Justificación profesional: falta completar.',
      valuation.confidence
        ? `Confianza del expediente: ${valuation.confidence === 'high' ? 'alta' : valuation.confidence === 'medium' ? 'media' : 'baja'}.`
        : 'Confianza del expediente: no disponible.',
      ...reasons.slice(0, 2).map((reason) => `Control adicional: ${reason}.`),
    ]

    return {
      ...base,
      title: 'Qué revisar antes de enviar',
      answer: checks.join('\n'),
      confidence: accepted.length >= 3 && contradictionCount === 0 ? 'high' : 'medium',
      evidence,
      actions: [{ label: 'Volver al expediente', href: `/dashboard/valuations/${caseId}` }],
    }
  }

  const support = [
    `Valor actual: ${formatUf(valuation.estimated_value_uf)}.`,
    `Evidencia: ${accepted.length} comparables aceptados${medianUfM2 == null ? '' : `, con mediana ${medianUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m²`}.`,
    `Confianza: ${valuation.confidence === 'high' ? 'alta' : valuation.confidence === 'medium' ? 'media' : valuation.confidence === 'low' ? 'baja' : 'no disponible'}.`,
    contradictionCount === 0
      ? 'No hay contradicciones detectadas en los comparables aceptados.'
      : `Hay ${contradictionCount} contradicción${contradictionCount === 1 ? '' : 'es'} que conviene resolver antes de usar el valor con el cliente.`,
    valuation.justification?.trim()
      ? 'La justificación profesional está registrada.'
      : 'Falta dejar una justificación profesional antes de enviar.',
  ]

  return {
    ...base,
    title: 'Por qué este valor es defendible',
    answer: support.join('\n'),
    confidence: accepted.length >= 3 && contradictionCount === 0 ? 'high' : 'medium',
    evidence,
    actions: [{ label: 'Abrir expediente', href: `/dashboard/valuations/${caseId}` }],
  }
}

function inferDomain(action: LegacyAction): ProposalDomain {
  if (action.href.includes('/valuations')) return 'valuations'
  if (action.href.includes('/properties')) return 'properties'
  if (action.href.includes('/reportes')) return 'reports'
  if (action.href.includes('/market')) return 'market'
  if (action.href.includes('/control')) return 'management'
  return 'cross-domain'
}

function inferPriority(response: BaseResponse, domain: ProposalDomain): ProposalPriority {
  const text = normalize(`${response.title} ${response.answer}`)
  if (text.includes('atrasad') || text.includes('urgente') || text.includes('critica') || text.includes('critico') || text.includes('fallid')) return 'critical'
  if (domain === 'valuations' && text.includes('revision')) return 'high'
  if (domain === 'properties' && (text.includes('identidad pendiente') || text.includes('vigencia'))) return 'high'
  if (domain === 'reports' && (text.includes('cola') || text.includes('escalad'))) return 'high'
  if (text.includes('brecha') || text.includes('cumplimiento')) return 'medium'
  return 'medium'
}

function inferKind(action: LegacyAction, domain: ProposalDomain): ProposalKind {
  const label = normalize(action.label)
  if (label.includes('tarea') || label.includes('seguimiento')) return 'follow_up'
  if (domain === 'properties' || label.includes('verificar')) return 'verify'
  if (domain === 'reports' || label.includes('reporte') || label.includes('preparar')) return 'prepare'
  return 'review'
}

function evidenceForDomain(evidence: Evidence[], domain: ProposalDomain) {
  if (domain === 'cross-domain') return evidence.slice(0, 4)
  const scoped = evidence.filter((item) => item.domain === domain)
  return (scoped.length ? scoped : evidence).slice(0, 3)
}

function proposalReason(response: BaseResponse, domain: ProposalDomain) {
  if (domain === 'valuations') return 'Hay un caso de valorización visible que requiere revisión dentro del alcance autorizado.'
  if (domain === 'properties') return 'La evidencia visible muestra identidad o vigencia pendiente de verificación.'
  if (domain === 'reports') return 'La telemetría autorizada de reportes muestra un estado que requiere revisión operativa.'
  if (domain === 'market') return 'El snapshot completo de mercado muestra un cambio diario verificable que requiere revisión.'
  if (domain === 'management') return 'La evidencia visible muestra una prioridad, tarea o brecha de gestión que requiere revisión.'
  return 'La propuesta deriva de evidencia autorizada y de la política de priorización vigente.'
}

function proposalId(response: BaseResponse, action: LegacyAction, domain: ProposalDomain) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ title: response.title, action: action.label, href: action.href, domain, period: response.periodLabel }))
    .digest('hex')
    .slice(0, 16)
  return `pp-${domain}-${digest}`
}

function buildProposals(response: BaseResponse): ActionProposal[] {
  return response.actions.slice(0, 4).map((action) => {
    const domain = inferDomain(action)
    return {
      id: proposalId(response, action, domain),
      kind: inferKind(action, domain),
      domain,
      action: action.label,
      objectLabel: response.title,
      reason: proposalReason(response, domain),
      priority: inferPriority(response, domain),
      href: action.href,
      requiresConfirmation: true,
      executionStatus: 'proposed',
      evidence: evidenceForDomain(response.evidence, domain),
    }
  })
}

function isReportPrompt(prompt: string) {
  return ['reporte', 'reportes', 'informe', 'informes', 'entrega', 'entregas', 'envio', 'envios'].some((term) => prompt.includes(term))
}

function seniorResponse(base: BaseResponse, prompt: string, expertise: ReturnType<typeof expertiseCardsForPrompt>, marketPulse: MarketOpportunityPulse | null): BaseResponse {
  if (!expertise.length) return base

  const topics = new Set(expertise.map((item) => item.topic))
  const evidence: Evidence[] = [
    ...base.evidence.filter((item) => item.domain === 'valuations' || item.domain === 'properties').slice(0, 4),
    {
      label: 'Alcance y fuentes aprobadas',
      source: 'client-response-pedro-pablo-2026-08-12 · Vitacura only',
      cutoff: '2026-08-12',
      domain: 'properties',
    },
  ]

  const lines: string[] = []
  lines.push('Hecho canónico: la etapa vigente está limitada a Vitacura y la metodología contractual de valorización tiene precedencia.')

  const asksMarketOpportunities = ['oportunidad', 'oportunidades', 'radar', 'mercado hoy', 'que revisar', 'qué revisar']
    .some((term) => normalize(prompt).includes(term))
  if (asksMarketOpportunities && marketPulse && !marketPulse.error) {
    const top = marketPulse.rows.slice(0, 3)
    if (top.length) {
      lines.push(`Pulso observable: ${marketPulse.evaluatedListings} avisos vigentes evaluados; ${marketPulse.withPriceReduction} muestran una baja de precio observada, ${marketPulse.longExposure} tienen al menos 60 días de exposición y ${marketPulse.belowNeighborhoodMedian} están al menos 5% bajo la mediana UF/m² de su barrio/tipo cuando existe evidencia territorial suficiente.`)
      for (const [index, row] of top.entries()) {
        const evidenceLabels = row.signals.map((signal) => signal.label).join(', ')
        lines.push(`${index + 1}. ${row.title || row.address || row.sourceListingId} · score de revisión ${row.score}/100 · ${evidenceLabels}.`)
      }
      lines.push('El score sólo prioriza revisión comercial; no demuestra urgencia, intención del propietario ni valor de cierre.')
      evidence.push({
        label: 'Pulso de oportunidades de mercado',
        source: 'Portal Inmobiliario · evidencia observada + historial N3uralia',
        cutoff: marketPulse.generatedAt,
        domain: 'market',
      })
    }
  }

  if (topics.has('pricing_strategy') || topics.has('commercial_valuation')) {
    lines.push('Interpretación senior: un precio de salida defendible debe construirse desde el inmueble concreto, sus atributos verificables y comparables aceptados; Portal representa oferta y CBRS evidencia transaccional sujeta a identidad y comparabilidad.')
    lines.push('Hipótesis a revisar: puedo evaluar si el precio publicado está defendido, alto o bajo sólo cuando exista un caso de propiedad/valorización identificable y evidencia suficiente.')
    lines.push('No tengo información suficiente para recomendar una cifra todavía. Falta identificar la propiedad o expediente y contar con comparables y atributos verificables.')
    lines.push('Siguiente acción: indícame la dirección o la valorización y revisaré precio publicado, valor comercial, comparables, historial y brechas de evidencia.')
  }

  if (topics.has('marketability')) {
    lines.push('Interpretación senior: liquidez y marketability deben leerse desde señales observables —historial de publicación, cambios de precio, profundidad de comparables y singularidad del activo—, no como una probabilidad automática de venta.')
    lines.push('No tengo información suficiente para estimar liquidez. Sin un inmueble identificado no corresponde afirmar días en mercado, absorción ni velocidad de venta.')
    lines.push('Siguiente acción: indica la propiedad para revisar sus señales de exposición y comparables dentro de Vitacura.')
  }

  if (topics.has('due_diligence')) {
    lines.push('Interpretación senior: antes de una recomendación definitiva conviene verificar identidad, superficies, regularización y antecedentes disponibles; una brecha documental reduce confianza, pero no demuestra por sí sola una pérdida de valor.')
    lines.push('Checkpoint humano: títulos, gravámenes, permisos y recepción final requieren antecedentes específicos y revisión humana; el asistente no emite opinión legal.')
  }

  if (topics.has('urban_planning')) {
    lines.push('Interpretación senior: no corresponde concluir constructibilidad, altura, uso de suelo o subdivisión sin identificar la zona y el antecedente oficial vigente del predio.')
  }

  if (topics.has('fiscal_appraisal') || topics.has('property_tax')) {
    lines.push('Interpretación senior: avalúo fiscal y contribuciones son antecedentes fiscales; no sustituyen el valor comercial ni la metodología contractual de valorización.')
  }

  return {
    ...base,
    title: 'Lectura senior inmobiliaria · Vitacura',
    answer: Array.from(new Set(lines)).join('\n'),
    evidence,
    actions: Array.from(new Map([
      ...base.actions,
      { label: 'Abrir Mercado Vitacura', href: '/dashboard/market' },
      { label: 'Abrir Valorizaciones', href: '/dashboard/valuations' },
    ].map((item) => [item.href, item])).values()),
    decisionPolicy: `${base.decisionPolicy} · senior-real-estate-vitacura-v2 · advisory-only`,
  }
}


function suggestedQuestionsForPrompt(
  prompt: string,
  expertise: ReturnType<typeof expertiseCardsForPrompt>,
  scopeConflict: ReturnType<typeof detectOutOfScopeMarket>,
) {
  const normalized = normalize(prompt)
  const topics = new Set(expertise.map((item) => item.topic))
  const suggestions: string[] = []

  if (scopeConflict) {
    return [
      '¿Qué evidencia comparable tenemos dentro de Vitacura?',
      '¿Qué microzona de Vitacura corresponde a esta propiedad?',
    ]
  }

  if (topics.has('commercial_valuation') || topics.has('pricing_strategy')) {
    suggestions.push(
      '¿Qué comparables sostienen mejor esta valorización?',
      '¿Qué evidencia falta para defender este precio?',
      '¿Hay diferencias entre Portal, CBRS y la valorización interna?',
    )
  }

  if (topics.has('marketability')) {
    suggestions.push(
      '¿Qué señales observables afectan la liquidez de esta propiedad?',
      '¿Qué cambió en su exposición o precio?',
      '¿Qué comparables muestran una posición de mercado distinta?',
    )
  }

  if (topics.has('due_diligence')) {
    suggestions.push(
      '¿Qué antecedente falta verificar antes de avanzar?',
      '¿Hay discrepancias de superficie o identidad?',
      '¿Qué punto requiere revisión humana?',
    )
  }

  if (topics.has('urban_planning')) {
    suggestions.push(
      '¿Qué antecedente oficial falta para confirmar la normativa del predio?',
      '¿La zona PRC está identificada con evidencia suficiente?',
    )
  }

  if (topics.has('fiscal_appraisal') || topics.has('property_tax')) {
    suggestions.push(
      '¿Qué dato fiscal está vigente para este inmueble?',
      '¿Qué parte de esta información no debe usarse como valor comercial?',
    )
  }

  if (normalized.includes('valoriz') && suggestions.length < 3) {
    suggestions.push('¿Qué valorizaciones requieren revisión ahora?')
  }

  if ((normalized.includes('propiedad') || normalized.includes('cartera')) && suggestions.length < 3) {
    suggestions.push('¿Qué propiedad tiene la mayor brecha de evidencia?')
  }

  if (normalized.includes('reporte') && suggestions.length < 3) {
    suggestions.push('¿Qué entrega requiere revisión operativa?')
  }

  return Array.from(new Set(suggestions)).slice(0, 3)
}

function reportResponse(base: BaseResponse, reports: ReportContext): BaseResponse {
  const coverage = {
    ...base.coverage,
    reports: {
      available: reports.available,
      total: reports.summary?.total ?? 0,
      sent: reports.summary?.sent ?? 0,
      failed: reports.summary?.failed ?? 0,
      queued: reports.summary?.queued ?? 0,
      escalated: reports.summary?.escalated ?? 0,
    },
  }

  if (!reports.available || !reports.summary) {
    return {
      ...base,
      title: 'Reportes no disponibles',
      answer: reports.reason === 'role_scope'
        ? 'Tu rol actual no expone la telemetría de reportes a Pedro Pablo. No se infieren estados de entrega fuera de ese alcance.'
        : 'La telemetría de reportes no está disponible para esta consulta. Pedro Pablo no infiere estados de entrega.',
      evidence: [],
      actions: [],
      coverage,
    }
  }

  const summary = reports.summary
  const cutoff = summary.latestCreatedAt || reports.generatedAt
  const topTypes = summary.byReportType.slice(0, 3)
    .map((item) => `${item.report_type}: ${item.count}`)
    .join(' · ')
  const lines = [
    `Últimas ${summary.total} entregas evaluadas: ${summary.sent} enviadas o escaladas, ${summary.failed} fallidas y ${summary.queued} en cola.`,
    `Tasa reciente registrada: ${summary.recentSuccessRate}%.`,
    `Último envío registrado: ${summary.lastSentAt || 'sin dato'}.`,
    topTypes ? `Tipos con actividad reciente: ${topTypes}.` : null,
  ].filter(Boolean)

  return {
    ...base,
    title: 'Estado de reportes y entregas',
    answer: lines.join('\n'),
    evidence: [{
      label: 'Telemetría de entregas',
      source: 'report_deliveries · resumen autorizado',
      cutoff,
      domain: 'reports',
    }],
    actions: [{ label: 'Revisar operación de reportes', href: '/dashboard/reportes/operacion' }],
    coverage,
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
  const pageContext = (body as { pageContext?: { pathname?: unknown; valuationCaseId?: unknown } })?.pageContext
  const valuationCaseId = typeof pageContext?.valuationCaseId === 'string' && /^[0-9a-f-]{36}$/i.test(pageContext.valuationCaseId)
    ? pageContext.valuationCaseId
    : null
  if (!prompt || prompt.length > 800) {
    return NextResponse.json({ error: 'La consulta debe contener entre 1 y 800 caracteres.' }, { status: 400 })
  }

  const baseRouting = routePedroPabloPrompt(prompt)
  const seniorExpertise = expertiseCardsForPrompt(prompt)
  const scopeConflict = detectOutOfScopeMarket(prompt)
  const routing = seniorExpertise.length > 0
    ? {
        route: 'full-agentic' as const,
        domains: ['market', 'valuations', 'properties', 'cross-domain'] as const,
        reason: 'La consulta activa criterio inmobiliario senior y requiere sintetizar evidencia antes de interpretar o recomendar.',
        maxEvidenceItems: 12,
      }
    : baseRouting
  const cookie = request.headers.get('cookie') ?? ''
  const [baseResponse, reportsResponse, valuationPageResponse, valuationReviewResponse, marketPulse] = await Promise.all([
    fetch(new URL('/api/pedro-pablo', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ prompt }),
      cache: 'no-store',
    }),
    fetch(new URL('/api/pedro-pablo/reports', request.url), {
      headers: { cookie },
      cache: 'no-store',
    }),
    valuationCaseId
      ? fetch(new URL(`/api/valuations/${valuationCaseId}/comparables`, request.url), { headers: { cookie }, cache: 'no-store' })
      : Promise.resolve(null),
    valuationCaseId
      ? fetch(new URL(`/api/valuations/${valuationCaseId}/professional-review`, request.url), { headers: { cookie }, cache: 'no-store' })
      : Promise.resolve(null),
    seniorExpertise.length > 0
      ? getMarketOpportunityPulse()
      : Promise.resolve(null),
  ])

  const payload = await baseResponse.json() as BaseResponse | { error?: string }
  if (!baseResponse.ok) {
    const error = 'error' in payload && typeof payload.error === 'string' ? payload.error : 'No fue posible consultar Pedro Pablo.'
    return NextResponse.json({ error }, { status: baseResponse.status })
  }

  const reportPayload = reportsResponse.ok
    ? await reportsResponse.json() as ReportContext
    : { available: false, reason: 'source_unavailable', summary: null, generatedAt: new Date().toISOString(), writesPerformed: 0 } as ReportContext
  const valuationPagePayload = valuationPageResponse?.ok
    ? await valuationPageResponse.json() as ValuationPageContext
    : null
  const valuationReviewPayload = valuationReviewResponse?.ok
    ? await valuationReviewResponse.json() as ValuationReviewContext
    : null

  let response = payload as BaseResponse
  response = isReportPrompt(normalize(prompt))
    ? reportResponse(response, reportPayload)
    : {
        ...response,
        coverage: {
          ...response.coverage,
          reports: {
            available: reportPayload.available,
            total: reportPayload.summary?.total ?? 0,
            sent: reportPayload.summary?.sent ?? 0,
            failed: reportPayload.summary?.failed ?? 0,
            queued: reportPayload.summary?.queued ?? 0,
            escalated: reportPayload.summary?.escalated ?? 0,
          },
        },
      }

  if (scopeConflict) {
    response = {
      ...response,
      title: 'Alcance de mercado · Vitacura',
      answer: `La etapa vigente está definida sólo para Vitacura. No incorporaré ${scopeConflict.requestedCommune} como universo canónico ni como fuente de comparación. Puedo responder usando Portal Inmobiliario, CBRS Vitacura, el KML entregado y datos canónicos internos dentro de Vitacura.`,
      confidence: 'high',
      evidence: [{
        label: 'Alcance aprobado por Pedro Pablo',
        source: 'client-response-pedro-pablo-2026-08-12 · Vitacura only',
        cutoff: '2026-08-12',
        domain: 'properties',
      }],
      actions: [{ label: 'Abrir Mercado Vitacura', href: '/dashboard/market' }],
    }
  }

  if (!scopeConflict && seniorExpertise.length > 0) {
    response = seniorResponse(response, prompt, seniorExpertise, marketPulse)
  }

  if (!scopeConflict && valuationCaseId && valuationPagePayload) {
    response = valuationPageAnswer(response, prompt, valuationCaseId, valuationPagePayload, valuationReviewPayload) ?? response
  }

  const suggestedQuestions = valuationCaseId
    ? ['¿Qué comparables sostienen mejor este valor?', '¿Qué debo revisar antes de enviarla a dirección?', '¿Hay alguna alerta importante en este expediente?']
    : suggestedQuestionsForPrompt(prompt, seniorExpertise, scopeConflict)
  const proposals = buildProposals(response)
  const scope = await requireUserScope()
  const canCreateTask = hasCapability(scope.role, 'tasks.global.manage') || hasCapability(scope.role, 'tasks.office.manage')
  const directorSupport = scope.role === 'director' || scope.role === 'subdirector'
  const assistantProfile = directorSupport
    ? {
        id: 'property-partners-director-support-v1',
        purpose: 'Apoyar a dirección con el conocimiento senior compartido del asistente de Pedro Pablo, limitado a su oficina, permisos y evidencia autorizada.',
        tone: PEDRO_PABLO_EXECUTIVE_PROFILE.communication.tone,
        answerOrder: PEDRO_PABLO_EXECUTIVE_PROFILE.preferredAnswerOrder,
        opinionPolicy: 'evidence-only-no-personal-opinion' as const,
        missingDataPolicy: 'state-unavailable-do-not-infer' as const,
        knowledgeSource: PEDRO_PABLO_EXECUTIVE_PROFILE.id,
        supportMode: 'shared-senior-knowledge-role-scoped',
      }
    : {
        id: PEDRO_PABLO_EXECUTIVE_PROFILE.id,
        purpose: PEDRO_PABLO_EXECUTIVE_PROFILE.purpose,
        tone: PEDRO_PABLO_EXECUTIVE_PROFILE.communication.tone,
        answerOrder: PEDRO_PABLO_EXECUTIVE_PROFILE.preferredAnswerOrder,
        opinionPolicy: 'evidence-only-no-personal-opinion' as const,
        missingDataPolicy: 'state-unavailable-do-not-infer' as const,
        knowledgeSource: PEDRO_PABLO_EXECUTIVE_PROFILE.id,
        supportMode: 'executive',
      }

  return NextResponse.json({
    ...response,
    proposals,
    suggestedQuestions,
    assistantProfile,
    availableConfirmedActions: canCreateTask ? ['create_task'] : [],
    proposalPolicy: 'pedro-pablo-proposal-contract-v4-reports-aware',
    executionPolicy: 'human-confirmation-required',
    executableWrites: 0,
    routing,
    seniorRealEstate: {
      active: seniorExpertise.length > 0,
      invisibleSpecialist: true,
      profile: PEDRO_PABLO_VITACURA_EXPERTISE,
      alignmentContract: PEDRO_PABLO_ALIGNMENT_CONTRACT,
      scopeConflict,
      expertise: seniorExpertise,
      reasoningContract: PEDRO_PABLO_VITACURA_EXPERTISE.reasoningFrame,
      policy: 'canonical-facts-first; expert-interpretation-second; hypothesis-explicit; human-checkpoint-required',
      writesPerformed: 0,
    },
    architecture: {
      pattern: 'fast-track-full-agentic',
      fastTrack: 'canonical direct answer with bounded evidence',
      fullAgentic: 'cross-domain investigation with governed evidence and human-confirmed writes',
      safety: 'read-first; all writes remain behind action-gateway preview + explicit confirmation',
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}