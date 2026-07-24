import type {
  ExecutiveDecision,
  ExecutiveDecisionValidationStatus,
  IntelligenceAudience,
} from '@/lib/n3uralia-intelligence-engine'
import { buildExecutiveDecisionFeed } from '@/lib/n3uralia-intelligence-engine'

export type ExecutiveCaseStatus =
  | 'generated'
  | 'under_review'
  | 'validated'
  | 'rejected'
  | 'closed'

export type ExecutiveCaseHistoryEvent = {
  id: string
  type: 'generated' | 'validation_updated' | 'outcome_recorded' | 'closed'
  occurredAt: string
  actor: 'n3uralia_engine' | 'human'
  note: string
}

export type ExecutiveCaseOutcome = {
  status: 'pending' | 'positive' | 'neutral' | 'negative'
  summary: string | null
  measuredAt: string | null
}

export type ExecutiveCaseOpenQuestion = {
  id: string
  question: string
  status: 'open' | 'answered'
  rationale: string
}

export type ExecutiveCase = {
  id: string
  decisionId: string
  status: ExecutiveCaseStatus
  priority: ExecutiveDecision['priority']
  confidence: ExecutiveDecision['confidence']
  subject: string
  recommendation: string
  reason: string
  href: string
  owner: IntelligenceAudience
  validationStatus: ExecutiveDecisionValidationStatus
  createdAt: string
  updatedAt: string
  history: ExecutiveCaseHistoryEvent[]
  openQuestions: ExecutiveCaseOpenQuestion[]
  outcome: ExecutiveCaseOutcome
}

function mapValidationToCaseStatus(
  validationStatus: ExecutiveDecisionValidationStatus,
): ExecutiveCaseStatus {
  if (validationStatus === 'validated') return 'validated'
  if (validationStatus === 'rejected') return 'rejected'
  return 'generated'
}

function buildOpenQuestions(decision: ExecutiveDecision): ExecutiveCaseOpenQuestion[] {
  const questions: ExecutiveCaseOpenQuestion[] = [
    {
      id: `executive-case.${decision.id}.question.current-evidence`,
      question: `¿Qué evidencia adicional confirma que “${decision.subject}” sigue vigente para el período actual?`,
      status: 'open',
      rationale: 'La recomendación debe contrastarse con evidencia reciente antes de ejecutarse.',
    },
    {
      id: `executive-case.${decision.id}.question.human-owner`,
      question: '¿Qué responsable humano validará esta recomendación y registrará la decisión final?',
      status: decision.validationStatus === 'pending_human_validation' ? 'open' : 'answered',
      rationale: 'Toda recomendación ejecutiva requiere propiedad y validación humana explícita.',
    },
  ]

  if (decision.confidence !== 'high') {
    questions.push({
      id: `executive-case.${decision.id}.question.confidence-gap`,
      question: `¿Qué dato faltante permitiría elevar la confianza actual (${decision.confidence})?`,
      status: 'open',
      rationale: 'La confianza no debe aumentar sin nueva evidencia verificable.',
    })
  }

  return questions
}

export function buildExecutiveCases(
  audience: IntelligenceAudience = 'ceo',
  generatedAt = new Date().toISOString(),
): ExecutiveCase[] {
  return buildExecutiveDecisionFeed(audience).map((decision) => ({
    id: `executive-case.${decision.id}`,
    decisionId: decision.id,
    status: mapValidationToCaseStatus(decision.validationStatus),
    priority: decision.priority,
    confidence: decision.confidence,
    subject: decision.subject,
    recommendation: decision.action,
    reason: decision.reason,
    href: decision.href,
    owner: audience,
    validationStatus: decision.validationStatus,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    history: [
      {
        id: `executive-case.${decision.id}.generated`,
        type: 'generated',
        occurredAt: generatedAt,
        actor: 'n3uralia_engine',
        note: 'Caso ejecutivo generado desde una recomendación del motor de inteligencia.',
      },
    ],
    openQuestions: buildOpenQuestions(decision),
    outcome: {
      status: 'pending',
      summary: null,
      measuredAt: null,
    },
  }))
}
