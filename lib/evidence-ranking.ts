import type {
  IntelligenceDomain,
  IntelligenceEvidence,
  IntelligenceSourceClass,
} from './n3uralia-intelligence-engine'

export type EvidenceRankingRole = 'ceo' | 'director' | 'partner'

export type RankedEvidence = {
  evidence: IntelligenceEvidence
  score: number
  reasons: string[]
  originalIndex: number
}

export type RankEvidenceInput = {
  question: string
  evidence: IntelligenceEvidence[]
  role: EvidenceRankingRole
}

const SOURCE_CLASS_SCORE: Record<IntelligenceSourceClass, number> = {
  client_evidence: 0.35,
  external_market: 0.3,
  n3uralia_model: 0.2,
  n3uralia_inference: 0.1,
}

const ROLE_DOMAIN_SCORE: Record<EvidenceRankingRole, Partial<Record<IntelligenceDomain, number>>> = {
  ceo: {
    executive: 0.3,
    reports: 0.25,
    crm: 0.2,
    market: 0.2,
    valuation: 0.2,
    documents: 0.15,
  },
  director: {
    executive: 0.25,
    reports: 0.25,
    crm: 0.25,
    market: 0.2,
    valuation: 0.2,
    documents: 0.15,
  },
  partner: {
    crm: 0.3,
    documents: 0.25,
  },
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  )
}

function questionMatchScore(questionTokens: ReadonlySet<string>, evidence: IntelligenceEvidence): number {
  if (questionTokens.size === 0) return 0

  const evidenceTokens = tokenize([
    evidence.label,
    evidence.domain,
    evidence.source,
    evidence.methodology,
    evidence.period ?? '',
  ].join(' '))

  let matches = 0
  for (const token of questionTokens) {
    if (evidenceTokens.has(token)) matches += 1
  }

  return Math.min(0.3, (matches / questionTokens.size) * 0.3)
}

function dataCompletenessScore(evidence: IntelligenceEvidence): number {
  let score = 0
  if (evidence.value !== null && evidence.value !== '') score += 0.05
  if (evidence.period) score += 0.025
  if (evidence.methodology.trim()) score += 0.025
  return score
}

function roundScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000
}

export function rankEvidence(input: RankEvidenceInput): RankedEvidence[] {
  const questionTokens = tokenize(input.question)
  const roleDomainScores = ROLE_DOMAIN_SCORE[input.role]

  return input.evidence
    .map((evidence, originalIndex): RankedEvidence => {
      const sourceScore = SOURCE_CLASS_SCORE[evidence.sourceClass]
      const domainScore = roleDomainScores[evidence.domain] ?? 0
      const relevanceScore = questionMatchScore(questionTokens, evidence)
      const completenessScore = dataCompletenessScore(evidence)
      const reasons: string[] = []

      if (sourceScore > 0) reasons.push(`source:${evidence.sourceClass}`)
      if (domainScore > 0) reasons.push(`role-domain:${evidence.domain}`)
      if (relevanceScore > 0) reasons.push('question-match')
      if (completenessScore > 0) reasons.push('complete-record')

      return {
        evidence,
        score: roundScore(sourceScore + domainScore + relevanceScore + completenessScore),
        reasons,
        originalIndex,
      }
    })
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
}
