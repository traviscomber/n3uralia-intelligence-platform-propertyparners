import assert from 'node:assert/strict'
import {
  CONDITION_CRITERIA,
  VALUATION_CONDITION_VERSION,
  evaluatePropertyCondition,
  type ConditionLevel,
  type PropertyConditionAssessment,
} from '../lib/valuation-condition'

function assessment(defaultScore: ConditionLevel | null): PropertyConditionAssessment {
  return {
    version: VALUATION_CONDITION_VERSION,
    inspectedAt: '2026-08-01T00:00:00.000Z',
    criteria: CONDITION_CRITERIA.map((criterion) => ({
      code: criterion.code,
      score: defaultScore,
      evidence: defaultScore === null ? [] : [{ kind: 'inspection_note', reference: `inspection:${criterion.code}` }],
    })),
  }
}

const excellent = evaluatePropertyCondition(assessment(5))
assert.equal(excellent.status, 'excellent')
assert.equal(excellent.score, 5)
assert.equal(excellent.coveragePct, 100)
assert.equal(excellent.evidenceCoveragePct, 100)
assert.equal(excellent.economicAdjustment.status, 'not_calculated')

const regular = evaluatePropertyCondition(assessment(3))
assert.equal(regular.status, 'regular')
assert.equal(regular.score, 3)

const missingCritical = assessment(4)
missingCritical.criteria = missingCritical.criteria.map((criterion) => criterion.code === 'installations' ? { ...criterion, score: null, evidence: [] } : criterion)
const blocked = evaluatePropertyCondition(missingCritical)
assert.equal(blocked.status, 'not_evaluable')
assert.equal(blocked.score, null)
assert.match(blocked.blockers.join(','), /installations:critical_criterion_missing/)

const criticalIssue = assessment(5)
criticalIssue.criteria = criticalIssue.criteria.map((criterion) => criterion.code === 'structure_envelope' ? { ...criterion, criticalIssue: true } : criterion)
const capped = evaluatePropertyCondition(criticalIssue)
assert.equal(capped.status, 'regular')
assert.match(capped.blockers.join(','), /structure_envelope:critical_issue_reported/)

const weakEvidence = assessment(4)
weakEvidence.criteria = weakEvidence.criteria.map((criterion, index) => index < 5 ? criterion : { ...criterion, evidence: [] })
const evidenceResult = evaluatePropertyCondition(weakEvidence)
assert.equal(evidenceResult.status, 'good')
assert.ok(evidenceResult.evidenceCoveragePct < 100)
assert.ok(evidenceResult.warnings.length > 0)

console.log('Property condition assessment verified: weighted classification, coverage, evidence and critical blockers.')
