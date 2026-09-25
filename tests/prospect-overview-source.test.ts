import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('prospect overview builds candidates from houses instead of truncating the global listing feed', () => {
  const route = readFileSync('app/api/prospects/overview/route.ts', 'utf8')
  assert.match(route, /from\('market_properties'\)[\s\S]*?\.eq\('property_type',\s*'Casa'\)/)
  assert.match(route, /chunkIds\(candidatePropertyIds,\s*50\)/)
  assert.doesNotMatch(route, /market_current_listings'\)[\s\S]{0,250}\.limit\(250\)/)
})
