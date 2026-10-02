import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('opportunity pulse requires an authenticated market role before service reads', () => {
  const source = readFileSync('lib/market-opportunity-intelligence.ts', 'utf8')
  assert.match(source, /auth\.getUser\(\)/)
  assert.match(source, /profiles/)
  assert.match(source, /admin.*ceo.*director.*subdirector.*seller/s)
  assert.match(source, /createServiceClient\(\)/)
  assert.ok(source.indexOf('auth.getUser()') < source.indexOf('createServiceClient()'))
})
