import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { PEDRO_PABLO_EXECUTIVE_PROFILE } from '@/lib/pedro-pablo/executive-profile'

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
  if (domain === 'valuations') return 'Hay un caso de valorización visible que requiere revisión dentro del alcance autorizado.'
  if (domain === 'properties') return 'La evidencia visible muestra identidad o vigencia pendiente de verificación.'
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
  const scope = await requireUserScope()
  const canCreateTask = hasCapability(scope.role, 'tasks.global.manage') || hasCapability(scope.role, 'tasks.office.manage')

  return NextResponse.json({
    ...response,
    proposals,
    assistantProfile: {
      id: PEDRO_PABLO_EXECUTIVE_PROFILE.id,
      purpose: PEDRO_PABLO_EXECUTIVE_PROFILE.purpose,
      tone: PEDRO_PABLO_EXECUTIVE_PROFILE.communication.tone,
      answerOrder: PEDRO_PABLO_EXECUTIVE_PROFILE.preferredAnswerOrder,
      opinionPolicy: 'evidence-only-no-personal-opinion',
      missingDataPolicy: 'state-unavailable-do-not-infer',
    },
    availableConfirmedActions: canCreateTask ? ['create_task'] : [],
    proposalPolicy: 'pedro-pablo-proposal-contract-v3-capability-aware',
    executionPolicy: 'human-confirmation-required',
    executableWrites: 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}