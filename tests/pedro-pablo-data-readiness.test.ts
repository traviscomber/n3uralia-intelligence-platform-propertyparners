import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { evaluateDataReadiness } from '../lib/intelligence/data-readiness'

test('Pedro Pablo readiness blocks consequential actions when evidence is missing', () => {
  const result = evaluateDataReadiness({
    canonicalEntityId: 'authorized-context',
    authorizationChecked: true,
    canonicalSelectionChecked: false,
    evidence: [],
    decisionTime: '2026-10-06T12:00:00.000Z',
    evaluatedAt: '2026-10-06T12:00:00.000Z',
  })

  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.some((item) => item.includes('completeness')))
  assert.ok(result.blockers.some((item) => item.includes('canonical_selection')))
})

test('Pedro Pablo readiness accepts a traceable authorized fact', () => {
  const result = evaluateDataReadiness({
    canonicalEntityId: 'valuation-case-1',
    authorizationChecked: true,
    canonicalSelectionChecked: true,
    evidence: [{
      source: 'valuation_cases',
      sourceRef: 'valuation_cases:valuation-case-1',
      subjectType: 'valuation_case',
      subjectId: 'valuation-case-1',
      field: 'valuation:estimated_value',
      authority: 'canonical',
      observedAt: '2026-10-06T11:00:00.000Z',
      verificationStatus: 'verified',
      valuePresent: true,
      valueKey: 'UF 20.000',
    }],
    decisionTime: '2026-10-06T12:00:00.000Z',
    evaluatedAt: '2026-10-06T12:00:00.000Z',
  })

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.blockers, [])
})

test('Action Gateway fails closed on blocked or unavailable readiness', () => {
  const gateway = readFileSync('app/api/pedro-pablo/action-gateway/route.ts', 'utf8')
  const support = readFileSync('app/api/pedro-pablo/decision-support/route.ts', 'utf8')

  assert.match(support, /dataReadiness: \{ mode: 'observe'/)
  assert.match(gateway, /context\.dataReadiness\.status === 'blocked'/)
  assert.match(gateway, /faltan datos verificables/)
  assert.match(gateway, /writesPerformed: 0/)
  assert.match(gateway, /pedro-pablo-action-gateway-v2-data-ready/)
})
