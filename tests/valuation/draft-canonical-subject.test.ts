import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const draftRoute = readFileSync('app/api/valuation/drafts/route.ts', 'utf8')

test('valuation draft canonical subject link fails closed', () => {
  assert.match(draftRoute, /assignment\.assigned_to !== scope\.profileId/)
  assert.match(draftRoute, /assignment\.status !== 'active'/)
  assert.match(draftRoute, /assignment\.property_id !== resolvedSubjectPropertyId/)
  assert.match(draftRoute, /scope\.scope === 'self'/)
  assert.match(draftRoute, /from\('market_properties'\)/)
  assert.match(draftRoute, /subject_property_id: resolvedSubjectPropertyId/)
})

test('valuation draft evidence preserves verified canonical linkage', () => {
  assert.match(draftRoute, /assignment: assignmentEvidence/)
  assert.match(draftRoute, /subjectPropertyId: resolvedSubjectPropertyId/)
  assert.doesNotMatch(draftRoute, /subject_property_id: payload\.sourcePropertyId/)
})
