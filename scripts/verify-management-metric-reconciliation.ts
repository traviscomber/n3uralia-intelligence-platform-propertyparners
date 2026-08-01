import assert from 'node:assert/strict'
import {
  calculateManagementMetricReconciliation,
  canApproveManagementMetricReconciliation,
  normalizeReconciliationTolerance,
} from '../lib/management-metric-reconciliation-core'

assert.equal(normalizeReconciliationTolerance(-1), 0)
assert.equal(normalizeReconciliationTolerance(2), 1)
assert.equal(normalizeReconciliationTolerance('0.05'), 0.05)

const exact = calculateManagementMetricReconciliation({
  publishedValue: 100,
  calculatedValue: 100,
  tolerance: 0,
})
assert.equal(exact.reconciliationStatus, 'exact')
assert.equal(exact.publicationStatus, 'provisional')
assert.equal(exact.absoluteDelta, 0)
assert.equal(exact.relativeDelta, 0)

const tolerated = calculateManagementMetricReconciliation({
  publishedValue: 100,
  calculatedValue: 101,
  tolerance: 0.01,
})
assert.equal(tolerated.reconciliationStatus, 'within_tolerance')
assert.equal(tolerated.publicationStatus, 'provisional')
assert.equal(tolerated.absoluteDelta, 1)
assert.equal(tolerated.relativeDelta, 0.01)

const different = calculateManagementMetricReconciliation({
  publishedValue: 100,
  calculatedValue: 102,
  tolerance: 0.01,
})
assert.equal(different.reconciliationStatus, 'different')
assert.equal(different.publicationStatus, 'blocked')

const zeroBaseline = calculateManagementMetricReconciliation({
  publishedValue: 0,
  calculatedValue: 2,
  tolerance: 1,
})
assert.equal(zeroBaseline.reconciliationStatus, 'different')
assert.equal(zeroBaseline.relativeDelta, null)
assert.equal(zeroBaseline.publicationStatus, 'blocked')

const missing = calculateManagementMetricReconciliation({
  publishedValue: null,
  calculatedValue: 3,
  tolerance: 0.1,
})
assert.equal(missing.reconciliationStatus, 'not_comparable')
assert.equal(missing.publicationStatus, 'blocked')

assert.equal(canApproveManagementMetricReconciliation({
  role: 'ceo',
  reconciliationStatus: 'within_tolerance',
  calculatedValueId: 'value-id',
  evidence: { source: 'verified' },
}), true)
assert.equal(canApproveManagementMetricReconciliation({
  role: 'admin',
  reconciliationStatus: 'exact',
  calculatedValueId: 'value-id',
  evidence: { source: 'verified' },
}), false)
assert.equal(canApproveManagementMetricReconciliation({
  role: 'ceo',
  reconciliationStatus: 'different',
  calculatedValueId: 'value-id',
  evidence: { source: 'verified' },
}), false)
assert.equal(canApproveManagementMetricReconciliation({
  role: 'ceo',
  reconciliationStatus: 'exact',
  calculatedValueId: null,
  evidence: {},
}), false)

console.log('Management metric reconciliation rules verified.')
