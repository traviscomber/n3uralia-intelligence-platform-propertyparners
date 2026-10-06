import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('market dashboard distinguishes full snapshot from latest daily pulse', () => {
  const page = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const snapshot = readFileSync('lib/market-operational.ts', 'utf8')

  assert.match(snapshot, /portal_daily_delta_v1/)
  assert.match(snapshot, /latestDeltaAt/)
  assert.match(snapshot, /latestDeltaNewCandidates/)
  assert.match(page, /Corte completo/)
  assert.match(page, /último pulso/)
  assert.match(page, /Nuevas · último pulso/)
})

test('market offer surfaces pulse listings without redefining the full inventory', () => {
  const page = readFileSync('app/dashboard/market/oferta/page.tsx', 'utf8')

  assert.match(page, /Último pulso diario/)
  assert.match(page, /nuevas detectadas/)
  assert.match(page, /Nueva desde corte/)
  assert.match(page, /Reobservada/)
  assert.match(page, /Las bajas sólo se confirman contra un full snapshot/)
  assert.match(page, /portal_inventory_discovery_v1/)
  assert.match(page, /portal_daily_delta_v1/)
})
