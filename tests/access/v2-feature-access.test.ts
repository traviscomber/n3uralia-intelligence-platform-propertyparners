import test from 'node:test'
import assert from 'node:assert/strict'
import { canUnlockV2Features } from '../../lib/v2-feature-access'

test('unlocks v2 features only for the authorized N3uralia account', () => {
  assert.equal(canUnlockV2Features({ email: 'juan@n3uralia.com' }), true)
  assert.equal(canUnlockV2Features({ email: ' JUAN@N3URALIA.COM ' }), true)
})

test('keeps v2 features locked for every other or missing identity', () => {
  assert.equal(canUnlockV2Features({ email: 'juan@propertypartners.cl' }), false)
  assert.equal(canUnlockV2Features({ email: null }), false)
  assert.equal(canUnlockV2Features(null), false)
})
