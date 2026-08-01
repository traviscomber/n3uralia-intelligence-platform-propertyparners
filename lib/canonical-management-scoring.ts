export const CANONICAL_MANAGEMENT_FORMULA_VERSION = 2
export const HISTORICAL_MANAGEMENT_FORMULA_VERSION = 1

export type ScoreValue = number | null
export type ScoreEvaluationState = 'evaluable' | 'not_evaluable' | 'inconsistent_source'
export type CanonicalScoringMode = 'canonical_v2' | 'historical_v1'
export type ManagementCategory =
  | 'Estrella'
  | 'Potencial'
  | 'Captador'
  | 'Vendedor'
  | 'Perseverante'
  | 'Riesgo'
  | 'Desarrollo'

export type ScoreComponent = {
  score: ScoreValue
  evaluable: boolean
  evaluationState: ScoreEvaluationState
  reason?: string
  numerator?: number | null
  denominator?: number | null
}

export type CanonicalManagementInputs = {
  stock: number | null
  stockTarget: number | null
  requirements: number | null
  requirementsReference: number | null
  pricingAtOrBelow105: number | null
  pricingBetween105And110: number | null
  pricingAbove110: number | null
  activeLeads: number | null
  classifiedLeads: number | null
  stale90Leads: number | null
  activeALeads: number | null
  stale15ALeads: number | null
  realizedVisits: number | null
  visitsTarget: number | null
  scheduledVisits: number | null
  conversionClosings: number | null
  conversionLeadBase: number | null
}

export type CanonicalScoringPolicy = {
  mode?: CanonicalScoringMode
  /** @deprecated Use mode. `formula` selects the historical v1 replay; `100` selects canonical v2. */
  conversionCap?: 'formula' | '100'
  specializedPriority?: Array<'Captador' | 'Vendedor' | 'Perseverante'>
}

export type CanonicalManagementResult = {
  formulaVersion: number
  scoringMode: CanonicalScoringMode
  components: {
    portfolio: {
      stock: ScoreComponent
      requirements: ScoreComponent
      pricing: ScoreComponent
      score: ScoreValue
    }
    followUp: {
      classified: ScoreComponent
      managed90: ScoreComponent
      managed15A: ScoreComponent
      score: ScoreValue
    }
    conversion: {
      visitsToTarget: ScoreComponent
      visitsPerformed: ScoreComponent
      closeRate: ScoreComponent
      score: ScoreValue
    }
  }
  scores: {
    portfolio: ScoreValue
    followUp: ScoreValue
    conversion: ScoreValue
    management: ScoreValue
  }
  classification: {
    value: ManagementCategory | null
    status: 'resolved' | 'blocked'
    candidates: ManagementCategory[]
    reason?: string
  }
}

const legacyRound = (value: number, decimals = 4) => Number(value.toFixed(decimals))
const clampScore = (value: number) => Math.min(Math.max(value, 0), 100)

export function roundScoreForDisplay(value: ScoreValue, decimals = 1): ScoreValue {
  if (value === null) return null
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError('decimals must be an integer between 0 and 6')
  }
  return Number(value.toFixed(decimals))
}

function resolveMode(policy: CanonicalScoringPolicy): CanonicalScoringMode {
  if (policy.mode) return policy.mode
  return policy.conversionCap === 'formula' ? 'historical_v1' : 'canonical_v2'
}

function finalizeScore(value: number, mode: CanonicalScoringMode, capAt100: boolean): number {
  if (mode === 'canonical_v2') return clampScore(value)
  return legacyRound(capAt100 ? Math.min(value, 100) : value)
}

function average(values: ScoreValue[], mode: CanonicalScoringMode): ScoreValue {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length !== values.length) return null
  const value = valid.reduce((sum, item) => sum + item, 0) / valid.length
  return mode === 'historical_v1' ? legacyRound(value) : value
}

function missingSource(numerator?: number | null, denominator?: number | null): ScoreComponent {
  return {
    score: null,
    evaluable: false,
    evaluationState: 'inconsistent_source',
    reason: 'missing_source',
    numerator,
    denominator,
  }
}

function invalidSource(reason: string, numerator?: number | null, denominator?: number | null): ScoreComponent {
  return {
    score: null,
    evaluable: false,
    evaluationState: 'inconsistent_source',
    reason,
    numerator,
    denominator,
  }
}

function notEvaluable(reason: string, numerator?: number | null, denominator?: number | null, score: ScoreValue = null): ScoreComponent {
  return {
    score,
    evaluable: false,
    evaluationState: 'not_evaluable',
    reason,
    numerator,
    denominator,
  }
}

function evaluated(score: number, numerator?: number | null, denominator?: number | null): ScoreComponent {
  return {
    score,
    evaluable: true,
    evaluationState: 'evaluable',
    numerator,
    denominator,
  }
}

function ratioScore(
  numerator: number | null,
  denominator: number | null,
  mode: CanonicalScoringMode,
  capAt100 = false,
): ScoreComponent {
  if (numerator === null || denominator === null) return missingSource(numerator, denominator)
  if (numerator < 0) return invalidSource('negative_numerator', numerator, denominator)
  if (denominator === 0) return notEvaluable('zero_denominator', numerator, denominator)
  if (denominator < 0) return invalidSource('negative_denominator', numerator, denominator)
  const raw = (numerator / denominator) * 100
  return evaluated(finalizeScore(raw, mode, capAt100), numerator, denominator)
}

function complementScore(stale: number | null, total: number | null, mode: CanonicalScoringMode): ScoreComponent {
  if (stale === null || total === null) return missingSource(stale, total)
  if (stale < 0) return invalidSource('negative_numerator', stale, total)
  if (total === 0) return notEvaluable('zero_denominator', stale, total)
  if (total < 0) return invalidSource('negative_denominator', stale, total)
  if (stale > total) return invalidSource('numerator_exceeds_denominator', stale, total)
  return evaluated(finalizeScore((1 - stale / total) * 100, mode, true), stale, total)
}

function targetScore(
  actual: number | null,
  target: number | null,
  mode: CanonicalScoringMode,
): ScoreComponent {
  if (actual === null || target === null) return missingSource(actual, target)
  if (actual < 0) return invalidSource('negative_numerator', actual, target)
  if (target === 0) {
    return mode === 'historical_v1'
      ? notEvaluable('zero_target_historical_operational_zero', actual, target, 0)
      : notEvaluable('zero_target', actual, target)
  }
  if (target < 0) return invalidSource('negative_target', actual, target)
  return evaluated(finalizeScore((actual / target) * 100, mode, true), actual, target)
}

function pricingScore(inputs: CanonicalManagementInputs, mode: CanonicalScoringMode): ScoreComponent {
  const counts = [inputs.pricingAtOrBelow105, inputs.pricingBetween105And110, inputs.pricingAbove110]
  if (counts.some((value) => value === null)) return missingSource()
  const numericCounts = counts as number[]
  const [best, middle, high] = numericCounts
  if (numericCounts.some((value) => value < 0)) return invalidSource('negative_band_count')
  const total = best + middle + high
  if (total === 0) return notEvaluable('zero_eligible_properties', 0, total)
  return evaluated(finalizeScore((best * 100 + middle * 50) / total, mode, true), best * 100 + middle * 50, total)
}

function closeRateScore(
  inputs: CanonicalManagementInputs,
  mode: CanonicalScoringMode,
): ScoreComponent {
  const closings = inputs.conversionClosings
  const leads = inputs.conversionLeadBase
  if (closings === null || leads === null) return missingSource(closings, leads)
  if (closings < 0) return invalidSource('negative_numerator', closings, leads)
  if (leads === 0) return notEvaluable('zero_denominator', closings, leads)
  if (leads < 0) return invalidSource('negative_denominator', closings, leads)

  const conversionPercent = (closings / leads) * 100
  const score = mode === 'historical_v1'
    ? Math.min(conversionPercent, 2.86) * 35
    : Math.min(conversionPercent / 2.86, 1) * 100

  return evaluated(finalizeScore(score, mode, mode === 'canonical_v2'), closings, leads)
}

function resolveClassification(
  scores: { portfolio: ScoreValue; followUp: ScoreValue; conversion: ScoreValue },
  policy: CanonicalScoringPolicy,
): CanonicalManagementResult['classification'] {
  const values = [scores.portfolio, scores.followUp, scores.conversion]
  const evaluable = values.filter((value): value is number => value !== null)
  if (evaluable.length < 2) return { value: null, status: 'blocked', candidates: [], reason: 'insufficient_evaluable_dimensions' }

  if (values.every((value) => value !== null && value >= 70)) return { value: 'Estrella', status: 'resolved', candidates: ['Estrella'] }
  if (values.every((value) => value !== null && value >= 50) && values.some((value) => value !== null && value >= 70)) {
    return { value: 'Potencial', status: 'resolved', candidates: ['Potencial'] }
  }

  const specialized: Array<'Captador' | 'Vendedor' | 'Perseverante'> = []
  if (scores.portfolio !== null && scores.portfolio >= 70) specialized.push('Captador')
  if (scores.conversion !== null && scores.conversion >= 70) specialized.push('Vendedor')
  if (scores.followUp !== null && scores.followUp >= 70) specialized.push('Perseverante')

  if (specialized.length === 1) return { value: specialized[0], status: 'resolved', candidates: specialized }
  if (specialized.length > 1) {
    if (specialized.length === 2 && specialized.includes('Captador') && specialized.includes('Perseverante')) {
      return { value: 'Captador', status: 'resolved', candidates: specialized }
    }
    const priority = policy.specializedPriority ?? []
    const selected = priority.find((candidate) => specialized.includes(candidate))
    if (selected && specialized.every((candidate) => priority.includes(candidate))) {
      return { value: selected, status: 'resolved', candidates: specialized }
    }
    return { value: null, status: 'blocked', candidates: specialized, reason: 'unresolved_specialized_category_priority' }
  }

  if (evaluable.filter((value) => value < 30).length >= 2) return { value: 'Riesgo', status: 'resolved', candidates: ['Riesgo'] }
  return { value: 'Desarrollo', status: 'resolved', candidates: ['Desarrollo'] }
}

export function calculateCanonicalManagementScores(
  inputs: CanonicalManagementInputs,
  policy: CanonicalScoringPolicy = {},
): CanonicalManagementResult {
  const mode = resolveMode(policy)
  const formulaVersion = mode === 'canonical_v2'
    ? CANONICAL_MANAGEMENT_FORMULA_VERSION
    : HISTORICAL_MANAGEMENT_FORMULA_VERSION

  const portfolio = {
    stock: targetScore(inputs.stock, inputs.stockTarget, mode),
    requirements: ratioScore(inputs.requirements, inputs.requirementsReference, mode, true),
    pricing: pricingScore(inputs, mode),
    score: null as ScoreValue,
  }
  portfolio.score = average([portfolio.stock.score, portfolio.requirements.score, portfolio.pricing.score], mode)

  const followUp = {
    classified: ratioScore(inputs.classifiedLeads, inputs.activeLeads, mode, mode === 'canonical_v2'),
    managed90: complementScore(inputs.stale90Leads, inputs.activeLeads, mode),
    managed15A: complementScore(inputs.stale15ALeads, inputs.activeALeads, mode),
    score: null as ScoreValue,
  }
  followUp.score = average([followUp.classified.score, followUp.managed90.score, followUp.managed15A.score], mode)

  const conversion = {
    visitsToTarget: targetScore(inputs.realizedVisits, inputs.visitsTarget, mode),
    visitsPerformed: ratioScore(inputs.realizedVisits, inputs.scheduledVisits, mode, mode === 'canonical_v2'),
    closeRate: closeRateScore(inputs, mode),
    score: null as ScoreValue,
  }
  conversion.score = average([conversion.visitsToTarget.score, conversion.visitsPerformed.score, conversion.closeRate.score], mode)

  const managementRaw = portfolio.score !== null && followUp.score !== null && conversion.score !== null
    ? portfolio.score * 0.4 + followUp.score * 0.3 + conversion.score * 0.3
    : null
  const management = managementRaw === null
    ? null
    : mode === 'historical_v1' ? legacyRound(managementRaw) : managementRaw

  const scores = { portfolio: portfolio.score, followUp: followUp.score, conversion: conversion.score, management }

  return {
    formulaVersion,
    scoringMode: mode,
    components: { portfolio, followUp, conversion },
    scores,
    classification: resolveClassification(scores, policy),
  }
}
