import assert from 'node:assert/strict'
import { test } from 'node:test'
import { valuationUatReadiness } from '../../lib/valuation-uat-readiness'

test('current canonical review case is UAT-ready only with property linkage, condition and 3 accepted comparables', () => {
  const ready = valuationUatReadiness({
    status: 'review',
    propertyType: 'Casa',
    subjectPropertyId: 'property-1',
    conditionStatus: 'good',
    acceptedComparableCount: 3,
  })
  assert.equal(ready.ready, true)
  assert.equal(ready.stage, 'review_ready')
  assert.deepEqual(ready.blockers, [])
})

test('legacy review case is not presented as UAT-ready', () => {
  const legacy = valuationUatReadiness({
    status: 'review',
    propertyType: 'Casa',
    subjectPropertyId: null,
    conditionStatus: null,
    acceptedComparableCount: 15,
  })
  assert.equal(legacy.ready, false)
  assert.equal(legacy.stage, 'not_ready')
  assert.deepEqual(legacy.blockers, [
    'Sin vínculo a propiedad operacional.',
    'Sin evaluación de condición.',
  ])
})

test('not-evaluable condition and insufficient comparables remain explicit blockers', () => {
  const blocked = valuationUatReadiness({
    status: 'review',
    propertyType: 'Casa',
    subjectPropertyId: 'property-1',
    conditionStatus: 'not_evaluable',
    acceptedComparableCount: 2,
  })
  assert.equal(blocked.ready, false)
  assert.deepEqual(blocked.blockers, [
    'Condición no evaluable.',
    'Menos de 3 comparables aceptados.',
  ])
})
