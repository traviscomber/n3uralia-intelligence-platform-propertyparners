import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canLinkValuationProperty } from '../lib/valuation-property-link-access'

test('global valuation scope can link a canonical property', () => {
  assert.equal(canLinkValuationProperty({
    scope: 'global',
    scopeTeam: null,
    territoryOffice: null,
    hasActiveSelfAssignment: false,
  }), true)
})

test('office valuation scope requires the property neighborhood to belong to the same office', () => {
  assert.equal(canLinkValuationProperty({
    scope: 'office',
    scopeTeam: 'Santa María',
    territoryOffice: 'Santa María',
    hasActiveSelfAssignment: false,
  }), true)
  assert.equal(canLinkValuationProperty({
    scope: 'office',
    scopeTeam: 'Santa María',
    territoryOffice: 'Lo Beltrán',
    hasActiveSelfAssignment: false,
  }), false)
})

test('self valuation scope requires an active individual property assignment', () => {
  assert.equal(canLinkValuationProperty({
    scope: 'self',
    scopeTeam: 'Santa María',
    territoryOffice: 'Santa María',
    hasActiveSelfAssignment: false,
  }), false)
  assert.equal(canLinkValuationProperty({
    scope: 'self',
    scopeTeam: 'Santa María',
    territoryOffice: null,
    hasActiveSelfAssignment: true,
  }), true)
})
