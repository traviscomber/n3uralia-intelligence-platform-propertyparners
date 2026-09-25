import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('valuation drafts authorize a linked property before persistence', () => {
  const route = readFileSync('app/api/valuation/drafts/route.ts', 'utf8')
  assert.match(route, /canLinkValuationProperty/)
  assert.match(route, /market_properties/)
  assert.match(route, /market_neighborhood_director_assignments/)
  assert.match(route, /property_director_directory/)
  assert.match(route, /property_assignments/)
  assert.match(route, /\.eq\('assigned_to', scope\.profileId\)/)
  assert.match(route, /subject_property_id: resolvedSourcePropertyId/)
  assert.match(route, /La propiedad está fuera del alcance autorizado/)
})

test('Property360 only exposes valuation CTA when the same link policy passes', () => {
  const route = readFileSync('app/api/prospects/property/[id]/route.ts', 'utf8')
  assert.match(route, /canLinkValuationProperty/)
  assert.match(route, /hasActiveSelfAssignment: Boolean\(selfAssignmentResult\.data\)/)
  assert.match(route, /territoryOffice: territoryDirector\?\.office_name/)
  assert.match(route, /canCreateValuation,/)
})
