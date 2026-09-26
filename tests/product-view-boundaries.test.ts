import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('Mercado keeps Pedro Pablo decision views separate from control and Property 360', () => {
  const page = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const layout = readFileSync('app/dashboard/market/layout.tsx', 'utf8')

  for (const label of ['Casas hoy', 'Oferta vs ventas', '4 años', 'Mapa KML']) {
    assert.match(layout, new RegExp(label))
  }

  assert.doesNotMatch(layout, /Comparables/)
  assert.doesNotMatch(page, /Balanced Scorecard/i)
  assert.doesNotMatch(page, /Leads.*Visitas.*Cierres/i)
  assert.doesNotMatch(page, /Property 360/)
  assert.match(page, /Mercado responde oferta, ventas, evolución y territorio/)
  assert.match(page, /Gestión, funnel, metas, alertas de equipo y Property 360 permanecen en sus módulos propios/)
})

test('landing does not become a second product navigation', () => {
  const page = readFileSync('app/page.tsx', 'utf8')
  assert.doesNotMatch(page, /\/dashboard\/market/)
  assert.doesNotMatch(page, /\/dashboard\/properties/)
  assert.doesNotMatch(page, /\/dashboard\/valuations/)
})
