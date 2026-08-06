import type { CopilotRole } from '@/lib/copilot-authorization'
import type {
  IntelligenceAction,
  IntelligenceDomain,
  IntelligenceEvidence,
  IntelligenceRisk,
  IntelligenceSignal,
  IntelligenceSourceClass,
  N3uraliaIntelligenceContext,
} from '@/lib/n3uralia-intelligence-engine'

type IntelligenceAccessPolicy = {
  domains: readonly IntelligenceDomain[]
  sourceClasses: readonly IntelligenceSourceClass[]
  actionAudiences: readonly IntelligenceAction['audience'][]
  contextAudience: N3uraliaIntelligenceContext['audience']
}

export type FilteredIntelligenceContext = N3uraliaIntelligenceContext

const ALL_DOMAINS: readonly IntelligenceDomain[] = [
  'executive',
  'crm',
  'market',
  'valuation',
  'documents',
  'reports',
]

const ALL_SOURCE_CLASSES: readonly IntelligenceSourceClass[] = [
  'client_evidence',
  'external_market',
  'n3uralia_model',
  'n3uralia_inference',
]

const DIRECTOR_DOMAINS: readonly IntelligenceDomain[] = [
  'executive',
  'crm',
  'market',
  'valuation',
  'documents',
  'reports',
]

const SELLER_DOMAINS: readonly IntelligenceDomain[] = ['crm', 'documents']
const SELLER_SOURCE_CLASSES: readonly IntelligenceSourceClass[] = [
  'client_evidence',
  'n3uralia_model',
  'n3uralia_inference',
]

const ACCESS_POLICIES: Record<CopilotRole, IntelligenceAccessPolicy> = {
  ceo: {
    domains: ALL_DOMAINS,
    sourceClasses: ALL_SOURCE_CLASSES,
    actionAudiences: ['ceo'],
    contextAudience: 'ceo',
  },
  admin: {
    domains: ALL_DOMAINS,
    sourceClasses: ALL_SOURCE_CLASSES,
    actionAudiences: ['ceo'],
    contextAudience: 'ceo',
  },
  director: {
    domains: DIRECTOR_DOMAINS,
    sourceClasses: ALL_SOURCE_CLASSES,
    actionAudiences: ['director'],
    contextAudience: 'director',
  },
  subdirector: {
    domains: DIRECTOR_DOMAINS,
    sourceClasses: ALL_SOURCE_CLASSES,
    actionAudiences: ['director'],
    contextAudience: 'director',
  },
  partner: {
    domains: SELLER_DOMAINS,
    sourceClasses: SELLER_SOURCE_CLASSES,
    actionAudiences: ['seller'],
    contextAudience: 'seller',
  },
  seller: {
    domains: SELLER_DOMAINS,
    sourceClasses: SELLER_SOURCE_CLASSES,
    actionAudiences: ['seller'],
    contextAudience: 'seller',
  },
}

function referencesOnlyVisibleEvidence(
  item: IntelligenceSignal | IntelligenceRisk | IntelligenceAction,
  visibleEvidenceIds: ReadonlySet<string>,
): boolean {
  return item.evidenceIds.every((evidenceId) => visibleEvidenceIds.has(evidenceId))
}

function auditAccessPolicy(input: {
  role: CopilotRole
  before: N3uraliaIntelligenceContext
  after: FilteredIntelligenceContext
}) {
  console.info('intelligence_access_policy', {
    event: 'intelligence_access_policy',
    role: input.role,
    evidenceBefore: input.before.evidence.length,
    evidenceAfter: input.after.evidence.length,
    signalsRemoved: input.before.signals.length - input.after.signals.length,
    risksRemoved: input.before.risks.length - input.after.risks.length,
    actionsRemoved: input.before.actions.length - input.after.actions.length,
    timestamp: new Date().toISOString(),
  })
}

export function applyIntelligenceAccessPolicy(
  context: N3uraliaIntelligenceContext,
  role: CopilotRole,
): FilteredIntelligenceContext {
  const policy = ACCESS_POLICIES[role]

  const evidence: IntelligenceEvidence[] = context.evidence.filter(
    (item) =>
      policy.domains.includes(item.domain) &&
      policy.sourceClasses.includes(item.sourceClass),
  )
  const visibleEvidenceIds = new Set(evidence.map((item) => item.id))

  const signals: IntelligenceSignal[] = context.signals.filter(
    (item) =>
      policy.domains.includes(item.domain) &&
      policy.sourceClasses.includes(item.sourceClass) &&
      referencesOnlyVisibleEvidence(item, visibleEvidenceIds),
  )

  const risks: IntelligenceRisk[] = context.risks.filter(
    (item) =>
      policy.domains.includes(item.domain) &&
      referencesOnlyVisibleEvidence(item, visibleEvidenceIds),
  )

  const actions: IntelligenceAction[] = context.actions.filter(
    (item) =>
      policy.domains.includes(item.domain) &&
      policy.actionAudiences.includes(item.audience) &&
      referencesOnlyVisibleEvidence(item, visibleEvidenceIds),
  )

  const filteredContext: FilteredIntelligenceContext = {
    ...context,
    audience: policy.contextAudience,
    evidence,
    signals,
    risks,
    actions,
  }

  auditAccessPolicy({ role, before: context, after: filteredContext })

  return filteredContext
}
