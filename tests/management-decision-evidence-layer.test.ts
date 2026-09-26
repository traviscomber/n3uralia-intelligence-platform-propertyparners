import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('management decision intelligence prefers approved, then verified live, then documentary evidence', () => {
  const evaluator = readFileSync('lib/management-decision-evaluator.ts','utf8')
  const approvedIndex = evaluator.indexOf('loadApprovedCompanyMetrics')
  const verifiedIndex = evaluator.indexOf('loadVerifiedCompanyMetrics')
  const fallbackIndex = evaluator.indexOf('getOperationalSummary()')

  assert.ok(approvedIndex >= 0)
  assert.ok(verifiedIndex > approvedIndex)
  assert.ok(fallbackIndex > verifiedIndex)
  assert.match(evaluator,/quality_status', 'verified'/)
  assert.match(evaluator,/evaluation_status', 'evaluable'/)
  assert.match(evaluator,/evidenceLayer: 'verified_live'|evaluatePack\(verified, 'verified_live'\)/)
})

test('verified live evidence is never labeled as client-approved', () => {
  const panel = readFileSync('components/management/ceo-intelligence-panel.tsx','utf8')
  const trace = readFileSync('lib/intelligence-decision-trace.ts','utf8')

  assert.match(panel,/Evidencia viva verificada · pendiente de aprobación/)
  assert.match(panel,/Métrica de gestión verificada y evaluable/)
  assert.match(trace,/verified_live: 'Evidencia viva verificada'/)
  assert.doesNotMatch(panel,/verified_live[^\n]*Métrica de gestión aprobada/)
})
