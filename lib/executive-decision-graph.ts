import type { ExecutiveCase, ExecutiveCaseStatus } from '@/lib/executive-cases'
import { buildExecutiveCases } from '@/lib/executive-cases'
import type { IntelligenceAudience, IntelligenceDomain } from '@/lib/n3uralia-intelligence-engine'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'

export type ExecutiveDecisionGraphNode = {
  id: string
  label: string
  domain: IntelligenceDomain
  priority: ExecutiveCase['priority']
  confidence: ExecutiveCase['confidence']
  readiness: ExecutiveCase['readiness']
  status: ExecutiveCaseStatus
  href: string
}

export type ExecutiveDecisionGraphEdgeType =
  | 'shared_domain'
  | 'shared_evidence'
  | 'shared_risk'
  | 'validation_dependency'

export type ExecutiveDecisionGraphEdge = {
  id: string
  from: string
  to: string
  type: ExecutiveDecisionGraphEdgeType
  label: string
  strength: number
}

export type ExecutiveDecisionGraph = {
  nodes: ExecutiveDecisionGraphNode[]
  edges: ExecutiveDecisionGraphEdge[]
}

export type EvidenceTimelineEvent = {
  id: string
  caseId: string
  occurredAt: string
  stage: 'evidence' | 'signal' | 'recommendation' | 'question' | 'validation' | 'outcome'
  title: string
  detail: string
  source: string
}

export type ExecutiveImpactSimulation = {
  caseId: string
  scenario: 'approve' | 'defer' | 'reject'
  confidence: ExecutiveCase['confidence']
  estimatedDirection: 'positive' | 'neutral' | 'negative'
  estimatedMagnitude: 'low' | 'medium' | 'high'
  affectedDomains: IntelligenceDomain[]
  affectedKpis: string[]
  affectedRisks: string[]
  dependentCaseIds: string[]
  assumptions: string[]
  disclaimer: string
}

export type ExecutiveMemoryRecord = {
  id: string
  caseId: string
  subject: string
  decision: 'pending' | 'approved' | 'rejected'
  outcome: ExecutiveCase['outcome']['status']
  lesson: string
  evidenceFingerprint: string[]
  recordedAt: string
}

export type ExecutivePortfolioColumn = {
  id: 'generated' | 'blocked' | 'ready' | 'validated' | 'closed'
  label: string
  cases: ExecutiveCase[]
}

export type ExecutivePortfolio = {
  cases: ExecutiveCase[]
  columns: ExecutivePortfolioColumn[]
  timeline: EvidenceTimelineEvent[]
  graph: ExecutiveDecisionGraph
  simulations: ExecutiveImpactSimulation[]
  memory: ExecutiveMemoryRecord[]
  metrics: {
    totalCases: number
    blockedCases: number
    readyCases: number
    validatedCases: number
    closedCases: number
    openQuestions: number
    evidenceCoverage: number
  }
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

export function buildExecutiveDecisionGraph(
  audience: IntelligenceAudience = 'ceo',
  generatedAt?: string,
): ExecutiveDecisionGraph {
  const cases = buildExecutiveCases(audience, generatedAt)
  const context = buildN3uraliaIntelligenceContext(audience)
  const actionsById = new Map(context.actions.map((action) => [action.id, action]))

  const nodes = cases.map((item): ExecutiveDecisionGraphNode => ({
    id: item.id,
    label: item.subject,
    domain: actionsById.get(item.decisionId)?.domain ?? 'executive',
    priority: item.priority,
    confidence: item.confidence,
    readiness: item.readiness,
    status: item.status,
    href: item.href,
  }))

  const edges: ExecutiveDecisionGraphEdge[] = []

  for (let leftIndex = 0; leftIndex < cases.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cases.length; rightIndex += 1) {
      const left = cases[leftIndex]
      const right = cases[rightIndex]
      const leftAction = actionsById.get(left.decisionId)
      const rightAction = actionsById.get(right.decisionId)
      const leftEvidence = new Set(leftAction?.evidenceIds ?? [])
      const sharedEvidence = (rightAction?.evidenceIds ?? []).filter((id) => leftEvidence.has(id))
      const sharedRiskCount = context.risks.filter((risk) =>
        risk.evidenceIds.some((id) => leftEvidence.has(id))
        && risk.evidenceIds.some((id) => (rightAction?.evidenceIds ?? []).includes(id)),
      ).length

      if (sharedEvidence.length > 0) {
        edges.push({
          id: `${left.id}.${right.id}.evidence`,
          from: left.id,
          to: right.id,
          type: 'shared_evidence',
          label: `${sharedEvidence.length} evidencia${sharedEvidence.length === 1 ? '' : 's'} compartida${sharedEvidence.length === 1 ? '' : 's'}`,
          strength: Math.min(100, 45 + sharedEvidence.length * 20),
        })
      } else if (leftAction?.domain === rightAction?.domain) {
        edges.push({
          id: `${left.id}.${right.id}.domain`,
          from: left.id,
          to: right.id,
          type: 'shared_domain',
          label: `Dominio ${leftAction?.domain ?? 'executive'}`,
          strength: 35,
        })
      }

      if (sharedRiskCount > 0) {
        edges.push({
          id: `${left.id}.${right.id}.risk`,
          from: left.id,
          to: right.id,
          type: 'shared_risk',
          label: `${sharedRiskCount} riesgo${sharedRiskCount === 1 ? '' : 's'} relacionado${sharedRiskCount === 1 ? '' : 's'}`,
          strength: Math.min(100, 40 + sharedRiskCount * 15),
        })
      }

      if (left.readiness === 'blocked' && right.readiness === 'ready_for_validation') {
        edges.push({
          id: `${left.id}.${right.id}.validation`,
          from: left.id,
          to: right.id,
          type: 'validation_dependency',
          label: 'Secuencia de validación sugerida',
          strength: 25,
        })
      }
    }
  }

  return { nodes, edges }
}

export function buildEvidenceTimeline(
  audience: IntelligenceAudience = 'ceo',
  generatedAt = new Date().toISOString(),
): EvidenceTimelineEvent[] {
  const cases = buildExecutiveCases(audience, generatedAt)
  const context = buildN3uraliaIntelligenceContext(audience)
  const actionsById = new Map(context.actions.map((action) => [action.id, action]))
  const evidenceById = new Map(context.evidence.map((evidence) => [evidence.id, evidence]))

  return cases.flatMap((item) => {
    const action = actionsById.get(item.decisionId)
    const evidenceEvents = (action?.evidenceIds ?? []).map((evidenceId, index): EvidenceTimelineEvent => {
      const evidence = evidenceById.get(evidenceId)
      return {
        id: `${item.id}.evidence.${index}`,
        caseId: item.id,
        occurredAt: item.createdAt,
        stage: 'evidence',
        title: evidence?.label ?? 'Evidencia vinculada',
        detail: `${evidence?.value ?? 'n/d'}${evidence?.period ? ` · ${evidence.period}` : ''}`,
        source: evidence?.source ?? 'Fuente no disponible',
      }
    })

    const questionEvents = item.openQuestions.map((question, index): EvidenceTimelineEvent => ({
      id: `${item.id}.question.${index}`,
      caseId: item.id,
      occurredAt: item.updatedAt,
      stage: 'question',
      title: question.question,
      detail: question.rationale,
      source: 'Gobernanza ejecutiva',
    }))

    return [
      ...evidenceEvents,
      {
        id: `${item.id}.recommendation`,
        caseId: item.id,
        occurredAt: item.createdAt,
        stage: 'recommendation' as const,
        title: item.subject,
        detail: item.recommendation,
        source: 'N3uralia Intelligence',
      },
      ...questionEvents,
      {
        id: `${item.id}.validation`,
        caseId: item.id,
        occurredAt: item.updatedAt,
        stage: 'validation' as const,
        title: 'Estado de validación',
        detail: item.validationStatus,
        source: 'Control humano',
      },
      {
        id: `${item.id}.outcome`,
        caseId: item.id,
        occurredAt: item.outcome.measuredAt ?? item.updatedAt,
        stage: 'outcome' as const,
        title: 'Resultado del caso',
        detail: item.outcome.summary ?? 'Pendiente de medición',
        source: 'Memoria ejecutiva',
      },
    ]
  })
}

export function simulateExecutiveImpact(
  executiveCase: ExecutiveCase,
  graph: ExecutiveDecisionGraph,
  scenario: ExecutiveImpactSimulation['scenario'] = 'approve',
): ExecutiveImpactSimulation {
  const relatedEdges = graph.edges.filter((edge) => edge.from === executiveCase.id || edge.to === executiveCase.id)
  const dependentCaseIds = unique(relatedEdges.map((edge) => edge.from === executiveCase.id ? edge.to : edge.from))
  const highPriority = executiveCase.priority === 'high'
  const blocked = executiveCase.readiness === 'blocked'

  const estimatedDirection = scenario === 'reject'
    ? 'negative'
    : scenario === 'defer'
      ? 'neutral'
      : blocked
        ? 'neutral'
        : 'positive'

  return {
    caseId: executiveCase.id,
    scenario,
    confidence: executiveCase.confidence,
    estimatedDirection,
    estimatedMagnitude: highPriority && scenario === 'approve' ? 'high' : dependentCaseIds.length > 0 ? 'medium' : 'low',
    affectedDomains: unique(graph.nodes
      .filter((node) => node.id === executiveCase.id || dependentCaseIds.includes(node.id))
      .map((node) => node.domain)),
    affectedKpis: executiveCase.priority === 'high'
      ? ['Velocidad de decisión', 'Cobertura de evidencia', 'Riesgo ejecutivo']
      : ['Tiempo de validación', 'Calidad de atribución'],
    affectedRisks: relatedEdges
      .filter((edge) => edge.type === 'shared_risk')
      .map((edge) => edge.label),
    dependentCaseIds,
    assumptions: [
      'La evidencia vinculada conserva vigencia durante el período de decisión.',
      'La ejecución requiere validación humana explícita.',
      blocked
        ? 'Las preguntas abiertas deben resolverse antes de ejecutar la recomendación.'
        : 'El caso no mantiene preguntas abiertas al momento de la simulación.',
    ],
    disclaimer: 'Estimación orientativa del motor N3uralia. No representa un resultado financiero garantizado ni reemplaza validación humana.',
  }
}

export function buildExecutiveMemory(
  cases: ExecutiveCase[],
  audience: IntelligenceAudience = 'ceo',
): ExecutiveMemoryRecord[] {
  const context = buildN3uraliaIntelligenceContext(audience)
  const actionsById = new Map(context.actions.map((action) => [action.id, action]))

  return cases.map((item) => ({
    id: `memory.${item.id}`,
    caseId: item.id,
    subject: item.subject,
    decision: item.validationStatus === 'validated'
      ? 'approved'
      : item.validationStatus === 'rejected'
        ? 'rejected'
        : 'pending',
    outcome: item.outcome.status,
    lesson: item.outcome.summary
      ?? (item.openQuestionCount > 0
        ? 'No ejecutar hasta resolver preguntas abiertas y documentar responsable humano.'
        : 'Caso preparado para validación; registrar resultado para convertir la decisión en aprendizaje reutilizable.'),
    evidenceFingerprint: actionsById.get(item.decisionId)?.evidenceIds ?? [],
    recordedAt: item.updatedAt,
  }))
}

export function buildExecutivePortfolio(
  audience: IntelligenceAudience = 'ceo',
  generatedAt = new Date().toISOString(),
): ExecutivePortfolio {
  const cases = buildExecutiveCases(audience, generatedAt)
  const graph = buildExecutiveDecisionGraph(audience, generatedAt)
  const timeline = buildEvidenceTimeline(audience, generatedAt)
  const memory = buildExecutiveMemory(cases, audience)
  const simulations = cases.map((item) => simulateExecutiveImpact(item, graph))
  const context = buildN3uraliaIntelligenceContext(audience)
  const evidenceIds = new Set(context.evidence.map((item) => item.id))
  const referencedEvidenceIds = new Set(context.actions.flatMap((item) => item.evidenceIds))
  const coveredEvidence = Array.from(referencedEvidenceIds).filter((id) => evidenceIds.has(id)).length

  const columns: ExecutivePortfolioColumn[] = [
    { id: 'generated', label: 'Generados', cases: cases.filter((item) => item.status === 'generated') },
    { id: 'blocked', label: 'Bloqueados', cases: cases.filter((item) => item.readiness === 'blocked') },
    { id: 'ready', label: 'Listos para validar', cases: cases.filter((item) => item.readiness === 'ready_for_validation') },
    { id: 'validated', label: 'Validados', cases: cases.filter((item) => item.status === 'validated') },
    { id: 'closed', label: 'Cerrados', cases: cases.filter((item) => item.status === 'closed') },
  ]

  return {
    cases,
    columns,
    timeline,
    graph,
    simulations,
    memory,
    metrics: {
      totalCases: cases.length,
      blockedCases: cases.filter((item) => item.readiness === 'blocked').length,
      readyCases: cases.filter((item) => item.readiness === 'ready_for_validation').length,
      validatedCases: cases.filter((item) => item.status === 'validated').length,
      closedCases: cases.filter((item) => item.status === 'closed').length,
      openQuestions: cases.reduce((sum, item) => sum + item.openQuestionCount, 0),
      evidenceCoverage: referencedEvidenceIds.size > 0
        ? Math.round((coveredEvidence / referencedEvidenceIds.size) * 100)
        : 0,
    },
  }
}
