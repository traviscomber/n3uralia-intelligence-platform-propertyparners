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
  outcome: ExecutiveCaseOutcome
}

function mapValidationToCaseStatus(
  validationStatus: ExecutiveDecisionValidationStatus,
): ExecutiveCaseStatus {
  if (validationStatus === 'validated') return 'validated'
  if (validationStatus === 'rejected') return 'rejected'
  return 'generated'
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
    outcome: {
      status: 'pending',
      summary: null,
      measuredAt: null,
    },
  }))
}
