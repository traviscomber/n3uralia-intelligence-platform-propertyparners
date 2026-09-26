export type PedroPabloEvidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties' | 'reports'
}

export type PedroPabloActionProposal = {
  id: string
  kind: 'review' | 'follow_up' | 'verify' | 'prepare'
  domain: 'management' | 'tasks' | 'valuations' | 'properties' | 'reports' | 'cross-domain'
  action: string
  objectLabel: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  href: string
  requiresConfirmation: true
  executionStatus: 'proposed'
  evidence: PedroPabloEvidence[]
}

export type PedroPabloDecisionSupportResponse = {
  proposals: PedroPabloActionProposal[]
  generatedAt: string
  periodLabel: string
  scopeLabel: string
}

export type PedroPabloTaskDraft = {
  sourceKey: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  entityName: ''
  assignedTo: null
  subjectProfileId: null
  dueDate: null
}

export function taskPriority(priority: PedroPabloActionProposal['priority']): PedroPabloTaskDraft['priority'] {
  if (priority === 'critical') return 'urgent'
  if (priority === 'high') return 'high'
  if (priority === 'low') return 'low'
  return 'medium'
}

export function taskSeverity(priority: PedroPabloActionProposal['priority']): PedroPabloTaskDraft['severity'] {
  if (priority === 'critical') return 'critical'
  if (priority === 'high') return 'warning'
  return 'info'
}

export function detailFromProposal(
  proposal: PedroPabloActionProposal,
  context: PedroPabloDecisionSupportResponse,
) {
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

export function buildPedroPabloTaskDraft(
  proposal: PedroPabloActionProposal,
  context: PedroPabloDecisionSupportResponse,
): PedroPabloTaskDraft {
  return {
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
}
