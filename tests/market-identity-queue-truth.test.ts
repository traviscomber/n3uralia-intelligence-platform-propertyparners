import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('identity queue distinguishes visible rows from full review workload', () => {
  const route = readFileSync('app/api/market/identity/matches/route.ts', 'utf8')
  const page = readFileSync('app/dashboard/properties/admin/identity/page.tsx', 'utf8')

  assert.match(route, /select\([^\n]+\{ count: 'exact' \}\)/)
  assert.match(route, /candidateHigh/)
  assert.match(route, /candidateMedium/)
  assert.match(route, /pending: highCount \+ mediumCount/)
  assert.match(page, /Pendientes totales/)
  assert.match(page, /Visibles ahora/)
  assert.match(page, /de \$\{data\?\.total \?\? 0\} candidatos del nivel visibles/)
})
