import assert from 'node:assert/strict'
import test from 'node:test'
import { selectCanonicalSales } from '../../lib/market-canonical'
import { latestCutoff } from '../../lib/market-intelligence-cutoffs'

test('canonical CBRS sales are not hidden by empty operational sources', () => {
  assert.equal(selectCanonicalSales(0, 0, 586), 586)
})

test('the explicit canonical source wins instead of the largest number', () => {
  assert.equal(selectCanonicalSales(9999, 12, 586), 586)
})

test('available direct sales remain a valid fallback', () => {
  assert.equal(selectCanonicalSales(null, 12, null), 12)
})

test('missing sales sources remain explicit', () => {
  assert.equal(selectCanonicalSales(null, undefined, null), null)
})

test('market intelligence exposes the latest valid source cutoff', () => {
  assert.equal(
    latestCutoff(['2026-01-09T00:00:00Z', null, '2026-03-09T20:31:02Z', 'invalid']),
    '2026-03-09T20:31:02Z',
  )
})

test('missing source cutoffs remain explicit', () => {
  assert.equal(latestCutoff([null, undefined, 'invalid']), null)
})
