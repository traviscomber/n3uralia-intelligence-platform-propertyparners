import assert from 'node:assert/strict'
import test from 'node:test'
import { selectCanonicalSales } from '../../lib/market-operational'

test('canonical CBRS sales are not hidden by empty operational sources', () => {
  assert.equal(selectCanonicalSales(0, 0, 586), 586)
})

test('available direct sales remain a valid fallback', () => {
  assert.equal(selectCanonicalSales(null, 12, null), 12)
})

test('missing sales sources remain explicit', () => {
  assert.equal(selectCanonicalSales(null, undefined, null), null)
})
