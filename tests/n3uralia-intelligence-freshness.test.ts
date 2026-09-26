import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('N3uralia executive intelligence uses latest canonical management authority instead of a hardcoded June cut', () => {
  const engine=readFileSync('lib/n3uralia-intelligence-engine.ts','utf8')
  assert.match(engine,/getLatestCanonicalManagementPeriod/)
  assert.match(engine,/getCanonicalManagementPeriods/)
  assert.match(engine,/ytdCreditedClosings/)
  assert.match(engine,/ytdCanonicalClosingTarget/)
  assert.doesNotMatch(engine,/getCompanySalesCompliance\('2026-06'\)/)
  assert.doesNotMatch(engine,/getBranchSalesYtdPerformance\('2026-06'\)/)
  assert.doesNotMatch(engine,/period: '2026-01\/2026-06'/)
})

test('executive action feed no longer republishes stale static CRM actions as current recommendations', () => {
  const engine=readFileSync('lib/n3uralia-intelligence-engine.ts','utf8')
  const actions=engine.split('function buildActions')[1]?.split('export function buildN3uraliaIntelligenceContext')[0] ?? ''
  assert.doesNotMatch(actions,/CRM_INTELLIGENCE\.actions/)
  assert.match(actions,/market-contrast/)
  assert.match(actions,/attributionNeedsWork/)
})
