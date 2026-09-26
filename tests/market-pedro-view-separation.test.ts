import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('Market keeps Pedro market decisions separate from management and Property 360', () => {
  const market = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const layout = readFileSync('app/dashboard/market/layout.tsx', 'utf8')

  assert.match(market, /Oferta actual/)
  assert.match(market, /Oferta vs ventas/)
  assert.match(market, /Evolución 4 años/)
  assert.match(market, /Mapa KML/)
  assert.match(market, /Casas/)
  assert.match(market, /Departamentos/)
  assert.match(market, /Tres universos\. No se mezclan\./)

  assert.doesNotMatch(market, /getExecutiveDashboardSnapshot/)
  assert.doesNotMatch(market, /Balanced Scorecard/)
  assert.doesNotMatch(market, /Proceso comercial/)
  assert.doesNotMatch(market, /Alertas del mes/)
  assert.doesNotMatch(market, /09 · Property 360/)

  assert.match(layout, /Oferta vs ventas/)
  assert.match(layout, /4 años/)
  assert.match(layout, /Mapa KML/)
})

test('Market evolution separates houses and apartments over four complete years', () => {
  const evolution = readFileSync('app/dashboard/market/evolucion/page.tsx', 'utf8')

  assert.match(evolution, /\.in\('property_type', \['Casa', 'Departamento'\]\)/)
  assert.match(evolution, /lastCompleteYear - 3/)
  assert.match(evolution, /propertyType="Casa"/)
  assert.match(evolution, /propertyType="Departamento"/)
  assert.match(evolution, /MoM comercial, metas, funnel y Balanced Scorecard pertenecen a Gestión/)
  assert.match(evolution, /Evento registral canónico agregado por año y tipo de propiedad/)
})
