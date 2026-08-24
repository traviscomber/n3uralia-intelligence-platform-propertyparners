import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
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
