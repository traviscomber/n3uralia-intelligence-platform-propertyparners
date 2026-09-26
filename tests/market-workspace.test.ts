import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('market workspace keeps current offer, evolution and territory as complementary views', () => {
  const layout = readFileSync('app/dashboard/market/layout.tsx', 'utf8')
  const evolution = readFileSync('app/dashboard/market/evolucion/page.tsx', 'utf8')
  const offerMap = readFileSync('app/dashboard/market/mapa/oferta/page.tsx', 'utf8')
  const territory = readFileSync('app/dashboard/market/mapa/page.tsx', 'utf8')

  assert.match(layout, /\/dashboard\/market\/oferta/)
  assert.match(layout, /\/dashboard\/market\/evolucion/)
  assert.match(layout, /\/dashboard\/market\/mapa/)
  assert.match(layout, /Conectar comparables/)

  assert.match(evolution, /market_cbrs_reference_metrics/)
  assert.match(evolution, /\.eq\('property_type', 'Casa'\)/)
  assert.match(evolution, /\.limit\(4\)/)
  assert.match(evolution, /Variación YoY/)
  assert.match(evolution, /No se inventa oferta histórica anterior/)

  assert.match(offerMap, /const MAX_LISTINGS = 500/)
  assert.match(offerMap, /Universo vigente/)
  assert.match(offerMap, /Muestra cargada/)
  assert.match(offerMap, /Math\.min\(totalCurrent, MAX_LISTINGS\)/)

  assert.match(territory, /Mapa de barrios de Vitacura/)
  assert.match(territory, /KML canónico/)
  assert.match(territory, /\/dashboard\/market\/mapa\/oferta/)
})
