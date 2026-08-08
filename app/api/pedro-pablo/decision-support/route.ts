import { NextRequest, NextResponse } from 'next/server'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties'
}

type LegacyAction = { label: string; href: string }

type BaseResponse = {
  title: string
  answer: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  actions: LegacyAction[]
  coverage: unknown
  decisionPolicy: string
  mode: string
  writesPerformed: number
  generatedAt: string
}

type ProposalPriority = 'critical' | 'high' | 'medium' | 'low'
type ProposalDomain = 'management' | 'tasks' | 'valuations' | 'properties' | 'cross-domain'
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

function inferDomain(action: LegacyAction): ProposalDomain {
  if (action.href.includes('/valuations')) return 'valuations'
  if (action.href.includes('/properties')) return 'properties'
  if (action.href.includes('/control')) return 'management'
  return 'cross-domain'
}

function inferPriority(response: BaseResponse, domain: ProposalDomain): ProposalPriority {
  const text = normalize(`${response.title} ${response.answer}`)
  if (text.includes('atrasad') || text.includes('urgente') || text.includes('critica') || text.includes('critico')) return 'critical'
  if (domain === 'valuations' && text.includes('revision')) return 'high'
  if (domain === 'properties' && (text.includes('identidad pendiente') || text.includes('vigencia'))) return 'high'
  if (text.includes('brecha') || text.includes('cumplimiento')) return 'medium'
  return 'medium'
}

function inferKind(action: LegacyAction, domain: ProposalDomain): ProposalKind {
  const label = normalize(action.label)
  if (label.includes('tarea') || label.includes('seguimiento')) return 'follow_up'
  if (domain === 'properties' || label.includes('verificar')) return 'verify'
  if (label.includes('reporte') || label.includes('preparar')) return 'prepare'
  return 'review'
}

function evidenceForDomain(evidence: Evidence[], domain: ProposalDomain) {
  if (domain === 'cross-domain') return evidence.slice(0, 4)
  const scoped = evidence.filter((item) => item.domain === domain)
  return (scoped.length ? scoped : evidence).slice(0, 3)
}

function proposalReason(response: BaseResponse, domain: ProposalDomain) {
  if (domain === 'valuations') return 'Existe contexto de valorización que requiere revisión dentro del alcance autorizado.'
  if (domain === 'properties') return 'La cartera contiene señales de identidad o vigencia que deben verificarse antes de decidir.'
  if (domain === 'management') return 'La lectura operativa detectó prioridades, tareas o brechas de gestión que requieren revisión humana.'
  return 'La recomendación deriva de evidencia autorizada y de la política visible de priorización.'
}

function buildProposals(response: BaseResponse): ActionProposal[] {
  return response.actions.slice(0, 4).map((action, index) => {
    const domain = inferDomain(action)
    return {
      id: `pp-proposal-${index + 1}-${domain}`,
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
  const baseResponse = await fetch(new URL('/api/pedro-pablo', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ prompt }),
    cache: 'no-store',
  })

  const payload = await baseResponse.json() as BaseResponse | { error?: string }
  if (!baseResponse.ok) {
    const error = 'error' in payload && typeof payload.error === 'string' ? payload.error : 'No fue posible consultar Pedro Pablo.'
    return NextResponse.json({ error }, { status: baseResponse.status })
  }

  const response = payload as BaseResponse
  const proposals = buildProposals(response)

  return NextResponse.json({
    ...response,
    proposals,
    proposalPolicy: 'pedro-pablo-proposal-contract-v1',
    executionPolicy: 'human-confirmation-required',
    executableWrites: 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
