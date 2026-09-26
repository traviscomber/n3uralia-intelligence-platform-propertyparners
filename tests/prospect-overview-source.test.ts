import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('prospect overview builds candidates from houses instead of truncating the global listing feed', () => {
  const route = readFileSync('app/api/prospects/overview/route.ts', 'utf8')
  assert.match(route, /from\('market_properties'\)[\s\S]*?\.eq\('property_type',\s*'Casa'\)/)
  assert.match(route, /chunkIds\(candidatePropertyIds,\s*50\)/)
  assert.doesNotMatch(route, /market_current_listings'\)[\s\S]{0,250}\.limit\(250\)/)
})

test('prospect overview resolves territory through stable group membership and primary group owner', () => {
  const route = readFileSync('app/api/prospects/overview/route.ts', 'utf8')
  assert.match(route,/property_territory_groups/)
  assert.match(route,/property_territory_group_neighborhoods/)
  assert.match(route,/property_territory_group_director_assignments/)
  assert.match(route,/assignment_role', 'primary'/)
  assert.match(route,/territoryGroups: visibleGroups/)
  assert.doesNotMatch(route,/market_neighborhood_director_assignments/)
})
