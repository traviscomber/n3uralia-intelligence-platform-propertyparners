import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('market dashboard distinguishes full snapshot from latest daily pulse', () => {
  const page = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const snapshot = readFileSync('lib/market-operational.ts', 'utf8')

  assert.match(snapshot, /portal_daily_delta_v1/)
  assert.match(snapshot, /latestDeltaAt/)
  assert.match(snapshot, /latestDeltaNewCandidates/)
  assert.match(page, /Actualizado/)
  assert.match(page, /Inventario completo verificado/)
  assert.match(page, /Nuevas hoy/)
})

test('market offer surfaces pulse listings without redefining the full inventory', () => {
  const page = readFileSync('app/dashboard/market/oferta/page.tsx', 'utf8')

  assert.match(page, /Actualización automática/)
  assert.match(page, /nuevas hoy/)
  assert.match(page, /Nueva/)
  assert.match(page, /Actualizada/)
  assert.match(page, /inventario completo verificado se mantiene como referencia para confirmar bajas/)
  assert.match(page, /portal_inventory_discovery_v1/)
  assert.match(page, /portal_daily_delta_v1/)
})

test('Pedro Pablo market answers use the latest daily update without presenting stale removals as today', () => {
  const route = readFileSync('app/api/pedro-pablo/route.ts', 'utf8')
  const support = readFileSync('app/api/pedro-pablo/decision-support/route.ts', 'utf8')

  assert.match(route, /latestDeltaAt/)
  assert.match(route, /latestDeltaNewCandidates/)
  assert.match(route, /Actualizado/)
  assert.match(route, /Las bajas sólo se confirman en un inventario completo/)
  assert.doesNotMatch(route, /El barrido completo de esta mañana/)
  assert.match(support, /La actualización de mercado muestra un cambio verificable/)
})
