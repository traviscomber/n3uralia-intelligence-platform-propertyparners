import assert from 'node:assert/strict'
import {
  CANONICAL_MANAGEMENT_FORMULA_VERSION,
  HISTORICAL_MANAGEMENT_FORMULA_VERSION,
  calculateCanonicalManagementScores,
  roundScoreForDisplay,
} from '../lib/canonical-management-scoring'

const approximatelyEqual = (actual: number | null, expected: number, tolerance = 1e-9) => {
  assert.notEqual(actual, null)
  assert.ok(Math.abs((actual as number) - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`)
}

const base = {
  stock: 80,
  stockTarget: 100,
  requirements: 90,
  requirementsReference: 100,
  pricingAtOrBelow105: 8,
  pricingBetween105And110: 2,
  pricingAbove110: 0,
  activeLeads: 100,
  classifiedLeads: 80,
  stale90Leads: 10,
  activeALeads: 20,
  stale15ALeads: 2,
  realizedVisits: 80,
  visitsTarget: 100,
  scheduledVisits: 100,
  conversionClosings: 3,
  conversionLeadBase: 100,
}

const canonical = calculateCanonicalManagementScores(base)
assert.equal(canonical.formulaVersion, CANONICAL_MANAGEMENT_FORMULA_VERSION)
assert.equal(canonical.scoringMode, 'canonical_v2')
assert.equal(canonical.components.portfolio.stock.score, 80)
assert.equal(canonical.components.portfolio.requirements.score, 90)
assert.equal(canonical.components.portfolio.pricing.score, 90)
approximatelyEqual(canonical.scores.portfolio, 260 / 3)
approximatelyEqual(canonical.scores.followUp, 260 / 3)
assert.equal(canonical.components.conversion.closeRate.score, 100)
assert.equal(canonical.classification.value, 'Estrella')
assert.equal(canonical.classification.status, 'resolved')

const zeroTarget = calculateCanonicalManagementScores({ ...base, stockTarget: 0, visitsTarget: 0 })
assert.equal(zeroTarget.components.portfolio.stock.score, null)
assert.equal(zeroTarget.components.portfolio.stock.evaluable, false)
assert.equal(zeroTarget.components.portfolio.stock.evaluationState, 'not_evaluable')
assert.equal(zeroTarget.components.portfolio.stock.reason, 'zero_target')
assert.equal(zeroTarget.components.conversion.visitsToTarget.score, null)
assert.equal(zeroTarget.scores.portfolio, null)
assert.equal(zeroTarget.scores.conversion, null)
assert.equal(zeroTarget.scores.management, null)

const historicalZeroTarget = calculateCanonicalManagementScores(
  { ...base, stockTarget: 0, visitsTarget: 0 },
  { mode: 'historical_v1' },
)
assert.equal(historicalZeroTarget.components.portfolio.stock.score, 0)
assert.equal(historicalZeroTarget.components.portfolio.stock.evaluationState, 'not_evaluable')
assert.equal(historicalZeroTarget.components.portfolio.stock.reason, 'zero_target_historical_operational_zero')
assert.equal(historicalZeroTarget.components.conversion.visitsToTarget.score, 0)

const exactThreshold = calculateCanonicalManagementScores({
  ...base,
  stock: 69.96,
  stockTarget: 100,
  requirements: 69.96,
  requirementsReference: 100,
  pricingAtOrBelow105: 6996,
  pricingBetween105And110: 0,
  pricingAbove110: 3004,
})
approximatelyEqual(exactThreshold.scores.portfolio, 69.96)
assert.equal(roundScoreForDisplay(exactThreshold.scores.portfolio), 70)
assert.notEqual(exactThreshold.classification.value, 'Captador')

const potential = calculateCanonicalManagementScores({
  ...base,
  classifiedLeads: 55,
  stale90Leads: 45,
  stale15ALeads: 9,
  realizedVisits: 55,
  scheduledVisits: 100,
  conversionClosings: 1.573,
})
assert.equal(potential.classification.value, 'Potencial')

const unresolved = calculateCanonicalManagementScores({
  ...base,
  stock: 40,
  requirements: 40,
  pricingAtOrBelow105: 4,
  pricingBetween105And110: 0,
  pricingAbove110: 6,
  classifiedLeads: 80,
  stale90Leads: 10,
  stale15ALeads: 2,
  realizedVisits: 80,
  scheduledVisits: 100,
  conversionClosings: 3,
})
assert.equal(unresolved.classification.status, 'blocked')
assert.deepEqual(unresolved.classification.candidates.sort(), ['Perseverante', 'Vendedor'].sort())

const historical = calculateCanonicalManagementScores(base, { mode: 'historical_v1' })
assert.equal(historical.formulaVersion, HISTORICAL_MANAGEMENT_FORMULA_VERSION)
assert.equal(historical.scoringMode, 'historical_v1')
assert.equal(historical.components.conversion.closeRate.score, 100.1)

const legacyPolicyAlias = calculateCanonicalManagementScores(base, { conversionCap: 'formula' })
assert.equal(legacyPolicyAlias.scoringMode, 'historical_v1')
assert.equal(legacyPolicyAlias.components.conversion.closeRate.score, 100.1)

const cappedRatios = calculateCanonicalManagementScores({
  ...base,
  classifiedLeads: 110,
  realizedVisits: 110,
  scheduledVisits: 100,
})
assert.equal(cappedRatios.components.followUp.classified.score, 100)
assert.equal(cappedRatios.components.conversion.visitsPerformed.score, 100)

const inconsistent = calculateCanonicalManagementScores({ ...base, stale90Leads: 101 })
assert.equal(inconsistent.components.followUp.managed90.score, null)
assert.equal(inconsistent.components.followUp.managed90.evaluationState, 'inconsistent_source')
assert.equal(inconsistent.components.followUp.managed90.reason, 'numerator_exceeds_denominator')
assert.equal(inconsistent.scores.followUp, null)

assert.equal(roundScoreForDisplay(63.32), 63.3)
assert.equal(roundScoreForDisplay(69.96), 70)
assert.throws(() => roundScoreForDisplay(50, 7), RangeError)

console.log('Canonical management scoring v2 verified: exact thresholds, hard cap, evaluability, historical replay and display rounding.')
