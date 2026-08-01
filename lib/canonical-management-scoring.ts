export const CANONICAL_MANAGEMENT_FORMULA_VERSION = 1

export type ScoreValue = number | null
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
  conversionCap: 'formula' | '100'
  specializedPriority?: Array<'Captador' | 'Vendedor' | 'Perseverante'>
}

export type CanonicalManagementResult = {
  formulaVersion: number
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

const round = (value: number, decimals = 4) => Number(value.toFixed(decimals))
const average = (values: ScoreValue[]) => {
  const valid = values.filter((value): value is number => value !== null)
  return valid.length === values.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null
}

function ratioScore(numerator: number | null, denominator: number | null, capAt100 = false): ScoreComponent {
  if (numerator === null || denominator === null) return { score: null, evaluable: false, reason: 'missing_source', numerator, denominator }
  if (denominator <= 0) return { score: null, evaluable: false, reason: 'zero_or_negative_denominator', numerator, denominator }
  const raw = (numerator / denominator) * 100
  return { score: round(capAt100 ? Math.min(raw, 100) : raw), evaluable: true, numerator, denominator }
}

function complementScore(stale: number | null, total: number | null): ScoreComponent {
  if (stale === null || total === null) return { score: null, evaluable: false, reason: 'missing_source', numerator: stale, denominator: total }
  if (total <= 0) return { score: null, evaluable: false, reason: 'zero_or_negative_denominator', numerator: stale, denominator: total }
  return { score: round((1 - stale / total) * 100), evaluable: true, numerator: stale, denominator: total }
}

function stockScore(stock: number | null, target: number | null): ScoreComponent {
  if (stock === null || target === null) return { score: null, evaluable: false, reason: 'missing_source', numerator: stock, denominator: target }
  if (target === 0) return { score: 0, evaluable: false, reason: 'zero_target_operational_score_zero', numerator: stock, denominator: target }
  if (target < 0) return { score: null, evaluable: false, reason: 'negative_target', numerator: stock, denominator: target }
  return { score: round(Math.min(stock / target, 1) * 100), evaluable: true, numerator: stock, denominator: target }
}

function pricingScore(inputs: CanonicalManagementInputs): ScoreComponent {
  const counts = [inputs.pricingAtOrBelow105, inputs.pricingBetween105And110, inputs.pricingAbove110]
  if (counts.some((value) => value === null)) return { score: null, evaluable: false, reason: 'missing_source' }
  const [best, middle, high] = counts as number[]
  const total = best + middle + high
  if (total <= 0) return { score: null, evaluable: false, reason: 'zero_eligible_properties', numerator: 0, denominator: total }
  return { score: round((best * 100 + middle * 50) / total), evaluable: true, numerator: best * 100 + middle * 50, denominator: total }
}

function closeRateScore(inputs: CanonicalManagementInputs, policy: CanonicalScoringPolicy): ScoreComponent {
  const closings = inputs.conversionClosings
  const leads = inputs.conversionLeadBase
  if (closings === null || leads === null) return { score: null, evaluable: false, reason: 'missing_source', numerator: closings, denominator: leads }
  if (leads <= 0) return { score: null, evaluable: false, reason: 'zero_or_negative_denominator', numerator: closings, denominator: leads }
  const conversionPercent = (closings / leads) * 100
  const formulaScore = Math.min(conversionPercent, 2.86) * 35
  return {
    score: round(policy.conversionCap === '100' ? Math.min(formulaScore, 100) : formulaScore),
    evaluable: true,
    numerator: closings,
    denominator: leads,
  }
}

function resolveClassification(scores: { portfolio: ScoreValue; followUp: ScoreValue; conversion: ScoreValue }, policy: CanonicalScoringPolicy): CanonicalManagementResult['classification'] {
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
  policy: CanonicalScoringPolicy = { conversionCap: 'formula' },
): CanonicalManagementResult {
  const portfolio = {
    stock: stockScore(inputs.stock, inputs.stockTarget),
    requirements: ratioScore(inputs.requirements, inputs.requirementsReference, true),
    pricing: pricingScore(inputs),
    score: null as ScoreValue,
  }
  portfolio.score = average([portfolio.stock.score, portfolio.requirements.score, portfolio.pricing.score])

  const followUp = {
    classified: ratioScore(inputs.classifiedLeads, inputs.activeLeads),
    managed90: complementScore(inputs.stale90Leads, inputs.activeLeads),
    managed15A: complementScore(inputs.stale15ALeads, inputs.activeALeads),
    score: null as ScoreValue,
  }
  followUp.score = average([followUp.classified.score, followUp.managed90.score, followUp.managed15A.score])

  const conversion = {
    visitsToTarget: inputs.visitsTarget === 0
      ? { score: 0, evaluable: false, reason: 'zero_target_operational_score_zero', numerator: inputs.realizedVisits, denominator: inputs.visitsTarget }
      : ratioScore(inputs.realizedVisits, inputs.visitsTarget, true),
    visitsPerformed: ratioScore(inputs.realizedVisits, inputs.scheduledVisits),
    closeRate: closeRateScore(inputs, policy),
    score: null as ScoreValue,
  }
  conversion.score = average([conversion.visitsToTarget.score, conversion.visitsPerformed.score, conversion.closeRate.score])

  const management = portfolio.score !== null && followUp.score !== null && conversion.score !== null
    ? round(portfolio.score * 0.4 + followUp.score * 0.3 + conversion.score * 0.3)
    : null

  const scores = { portfolio: portfolio.score, followUp: followUp.score, conversion: conversion.score, management }

  return {
    formulaVersion: CANONICAL_MANAGEMENT_FORMULA_VERSION,
    components: { portfolio, followUp, conversion },
    scores,
    classification: resolveClassification(scores, policy),
  }
}
