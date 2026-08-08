import { NextRequest, NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties'
}

type ActionProposal = {
  id: string
  kind: 'review' | 'follow_up' | 'verify' | 'prepare'
  domain: 'management' | 'tasks' | 'valuations' | 'properties' | 'cross-domain'
  action: string
  objectLabel: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  href: string
  requiresConfirmation: true
  executionStatus: 'proposed'
  evidence: Evidence[]
}

type DecisionSupportResponse = {
  proposals: ActionProposal[]
  generatedAt: string
  periodLabel: string
  scopeLabel: string
}

function taskPriority(priority: ActionProposal['priority']) {
  if (priority === 'critical') return 'urgent'
  if (priority === 'high') return 'high'
  if (priority === 'low') return 'low'
  return 'medium'
}

function taskSeverity(priority: ActionProposal['priority']) {
  if (priority === 'critical') return 'critical'
  if (priority === 'high') return 'warning'
  return 'info'
}

function detailFromProposal(proposal: ActionProposal, context: DecisionSupportResponse) {
  const evidence = proposal.evidence
    .map((item) => [item.label, item.source, item.reference, item.cutoff].filter(Boolean).join(' · '))
    .join(' | ')
  return [
    proposal.reason,
    `Origen: Pedro Pablo · ${context.scopeLabel} · ${context.periodLabel}.`,
    evidence ? `Evidencia: ${evidence}.` : null,
    'Acción creada mediante confirmación humana en Pedro Pablo Action Gateway.',
  ].filter(Boolean).join(' ')
}

async function regenerateProposal(request: NextRequest, prompt: string, proposalId: string) {
  const cookie = request.headers.get('cookie') ?? ''
  const response = await fetch(new URL('/api/pedro-pablo/decision-support', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ prompt }),
    cache: 'no-store',
  })
  const payload = await response.json() as DecisionSupportResponse | { error?: string }
  if (!response.ok) {
    return { error: NextResponse.json({ error: 'No fue posible regenerar la propuesta autorizada.' }, { status: response.status }) }
  }
  const context = payload as DecisionSupportResponse
  const proposal = context.proposals.find((item) => item.id === proposalId)
  if (!proposal) {
    return { error: NextResponse.json({ error: 'La propuesta ya no coincide con el contexto autorizado actual.' }, { status: 409 }) }
  }
  return { proposal, context, cookie }
}

export async function POST(request: NextRequest) {
  try {
    await requireAnyCapability(['tasks.global.manage', 'tasks.office.manage'])

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
    }

    const input = body as { prompt?: unknown; proposalId?: unknown; mode?: unknown; confirm?: unknown }
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
    const proposalId = typeof input.proposalId === 'string' ? input.proposalId.trim() : ''
    const mode = input.mode === 'execute' ? 'execute' : 'preview'
    const confirm = input.confirm === true

    if (!prompt || prompt.length > 800 || !proposalId) {
      return NextResponse.json({ error: 'Prompt y propuesta válidos son requeridos.' }, { status: 400 })
    }

    const regenerated = await regenerateProposal(request, prompt, proposalId)
    if ('error' in regenerated) return regenerated.error
    const { proposal, context, cookie } = regenerated

    const taskDraft = {
      sourceKey: `pedro-pablo:${proposal.id}`,
      title: proposal.action,
      detail: detailFromProposal(proposal, context),
      severity: taskSeverity(proposal.priority),
      priority: taskPriority(proposal.priority),
      entityName: '',
      assignedTo: null,
      subjectProfileId: null,
      dueDate: null,
    }

    if (mode === 'preview') {
      return NextResponse.json({
        proposal,
        taskDraft,
        confirmationRequired: true,
        executable: true,
        executionStatus: 'preview',
        writesPerformed: 0,
        gatewayPolicy: 'pedro-pablo-action-gateway-v1',
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!confirm) {
      return NextResponse.json({ error: 'Se requiere confirmación humana explícita.' }, { status: 409 })
    }

    const taskResponse = await fetch(new URL('/api/management/tasks', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify(taskDraft),
      cache: 'no-store',
    })
    const taskPayload = await taskResponse.json() as { task?: { id?: string }; error?: string }
    if (!taskResponse.ok) {
      return NextResponse.json({ error: taskPayload.error || 'No fue posible ejecutar la acción confirmada.' }, { status: taskResponse.status })
    }

    return NextResponse.json({
      proposalId: proposal.id,
      executionStatus: 'executed',
      writesPerformed: 1,
      task: taskPayload.task ?? null,
      gatewayPolicy: 'pedro-pablo-action-gateway-v1',
      confirmedByHuman: true,
      executedAt: new Date().toISOString(),
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
