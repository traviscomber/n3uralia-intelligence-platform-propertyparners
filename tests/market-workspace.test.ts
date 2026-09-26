import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('market workspace keeps Pedro market questions in complementary views', () => {
  const layout = readFileSync('app/dashboard/market/layout.tsx', 'utf8')
  const evolution = readFileSync('app/dashboard/market/evolucion/page.tsx', 'utf8')
  const offerMap = readFileSync('app/dashboard/market/mapa/oferta/page.tsx', 'utf8')
  const territory = readFileSync('app/dashboard/market/mapa/page.tsx', 'utf8')

  assert.match(layout, /\/dashboard\/market\/oferta/)
  assert.match(layout, /\/dashboard\/market\/inteligencia/)
  assert.match(layout, /\/dashboard\/market\/evolucion/)
  assert.match(layout, /\/dashboard\/market\/mapa/)
  assert.match(layout, /Comparables/)

  assert.match(evolution, /market_cbrs_reference_metrics/)
  assert.match(evolution, /\.in\('property_type', \['Casa', 'Departamento'\]\)/)
  assert.match(evolution, /lastCompleteYear - 3/)
  assert.match(evolution, /propertyType="Casa"/)
  assert.match(evolution, /propertyType="Departamento"/)

  assert.match(offerMap, /const MAX_LISTINGS = 500/)
  assert.match(offerMap, /Universo vigente/)
  assert.match(offerMap, /Muestra cargada/)
  assert.match(offerMap, /Math\.min\(totalCurrent, MAX_LISTINGS\)/)

  assert.match(territory, /Mapa de barrios de Vitacura/)
  assert.match(territory, /KML canónico/)
  assert.match(territory, /\/dashboard\/market\/mapa\/oferta/)
})
