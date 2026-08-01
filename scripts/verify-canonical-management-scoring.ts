import assert from 'node:assert/strict'
import { calculateCanonicalManagementScores } from '../lib/canonical-management-scoring'

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

const estrella = calculateCanonicalManagementScores(base, { conversionCap: '100' })
assert.equal(estrella.components.portfolio.stock.score, 80)
assert.equal(estrella.components.portfolio.requirements.score, 90)
assert.equal(estrella.components.portfolio.pricing.score, 90)
assert.equal(estrella.scores.portfolio, 86.6667)
assert.equal(estrella.scores.followUp, 86.6667)
assert.equal(estrella.components.conversion.closeRate.score, 100)
assert.equal(estrella.classification.value, 'Estrella')
assert.equal(estrella.classification.status, 'resolved')

const zeroTarget = calculateCanonicalManagementScores({ ...base, stockTarget: 0, visitsTarget: 0 }, { conversionCap: '100' })
assert.equal(zeroTarget.components.portfolio.stock.score, 0)
assert.equal(zeroTarget.components.portfolio.stock.evaluable, false)
assert.equal(zeroTarget.components.portfolio.stock.reason, 'zero_target_operational_score_zero')
assert.equal(zeroTarget.components.conversion.visitsToTarget.score, 0)

const strictThreshold = calculateCanonicalManagementScores({
  ...base,
  stock: 69.5,
  stockTarget: 100,
  requirements: 69.5,
  requirementsReference: 100,
  pricingAtOrBelow105: 695,
  pricingBetween105And110: 0,
  pricingAbove110: 305,
  classifiedLeads: 35,
  stale90Leads: 65,
  stale15ALeads: 13,
  realizedVisits: 69.5,
  scheduledVisits: 100,
  conversionClosings: 1.987,
}, { conversionCap: '100' })
assert.ok((strictThreshold.scores.portfolio ?? 0) < 70)
assert.notEqual(strictThreshold.classification.value, 'Captador')

const potential = calculateCanonicalManagementScores({
  ...base,
  classifiedLeads: 55,
  stale90Leads: 45,
  stale15ALeads: 9,
  realizedVisits: 55,
  scheduledVisits: 100,
  conversionClosings: 1.573,
}, { conversionCap: '100' })
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
}, { conversionCap: '100' })
assert.equal(unresolved.classification.status, 'blocked')
assert.deepEqual(unresolved.classification.candidates.sort(), ['Perseverante', 'Vendedor'].sort())

const formulaCap = calculateCanonicalManagementScores(base, { conversionCap: 'formula' })
assert.equal(formulaCap.components.conversion.closeRate.score, 100.1)

console.log('Canonical management scoring verified: formulas, zero targets, strict thresholds and category blocking.')
