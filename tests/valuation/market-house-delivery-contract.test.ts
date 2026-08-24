import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildMarketHouseSignals,
  emptyMarketHouseDeliverySummary,
  hasComparablePortalTerritory,
  missingExactPortalNeighborhoods,
} from '../../lib/market-house-intelligence'

const migration = readFileSync(
  'supabase/migrations/20260824153000_expose_house_delivery_intelligence_v1.sql',
  'utf8',
)

test('la inteligencia contractual se limita a casas en venta', () => {
  assert.match(migration, /ct\.property_type = 'Casa'/)
  assert.match(migration, /mp\.property_type = 'Casa'/)
  assert.match(migration, /lower\(btrim\(ml\.operation\)\) in \('sale', 'venta'\)/)
  assert.doesNotMatch(migration, /property_type = 'Departamento'/)
})

test('los agregados no quedan expuestos a anon', () => {
  assert.match(migration, /security definer/)
  assert.match(migration, /set search_path = pg_catalog, public/)
  assert.match(migration, /revoke all on function public\.get_market_house_delivery_summary_v1\(\) from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.get_market_house_delivery_summary_v1\(\) to authenticated/)
})

test('la cobertura territorial insuficiente bloquea la comparación de oferta', () => {
  const summary = {
    ...emptyMarketHouseDeliverySummary,
    portalCurrentHouses: 22,
    portalExactKmlHouses: 1,
  }
  assert.equal(missingExactPortalNeighborhoods(summary), 21)
  assert.equal(hasComparablePortalTerritory(summary), false)
})

test('la comparación exige al menos tres avisos y 80% de cobertura', () => {
  const summary = {
    ...emptyMarketHouseDeliverySummary,
    portalCurrentHouses: 10,
    portalExactKmlHouses: 8,
  }
  assert.equal(hasComparablePortalTerritory(summary), true)
})

test('las señales usan datos CBRS y una muestra mínima', () => {
  const signals = buildMarketHouseSignals([
    { neighborhoodName: 'Santa María', cbrsTransactions: 586, cbrsMedianPriceUf: 26000, cbrsMedianUfM2: 85.7, cbrsAsOf: '2025-12-30' },
    { neighborhoodName: 'Nueva Costanera', cbrsTransactions: 191, cbrsMedianPriceUf: 17000, cbrsMedianUfM2: 115.1, cbrsAsOf: '2025-07-29' },
    { neighborhoodName: 'Muestra pequeña', cbrsTransactions: 4, cbrsMedianPriceUf: 20000, cbrsMedianUfM2: 999, cbrsAsOf: '2025-01-01' },
  ])

  assert.equal(signals.minimumSample, 30)
  assert.equal(signals.mostSales?.neighborhoodName, 'Santa María')
  assert.equal(signals.highestUfM2?.neighborhoodName, 'Nueva Costanera')
})

test('las señales quedan vacías sin muestra suficiente', () => {
  const signals = buildMarketHouseSignals([
    { neighborhoodName: 'Muestra pequeña', cbrsTransactions: 2, cbrsMedianPriceUf: 20000, cbrsMedianUfM2: 150, cbrsAsOf: null },
  ])

  assert.equal(signals.mostSales, null)
  assert.equal(signals.highestUfM2, null)
})
