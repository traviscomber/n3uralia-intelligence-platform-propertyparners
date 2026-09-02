import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isSourceDatasetCompatible,
  validateMarketContractRow,
} from '../lib/market-contract-import'

assert.equal(isSourceDatasetCompatible('portal_inmobiliario', 'portal_houses'), true)
assert.equal(isSourceDatasetCompatible('portal_inmobiliario', 'registered_sales'), false)
assert.equal(isSourceDatasetCompatible('cbrs', 'registered_sales'), true)
assert.equal(isSourceDatasetCompatible('cbrs', 'client_sales'), false)
assert.equal(isSourceDatasetCompatible('client', 'client_sales'), true)
assert.equal(isSourceDatasetCompatible('kml', 'kml_neighborhoods'), true)
assert.equal(isSourceDatasetCompatible('manual_import', 'registered_sales'), true)

assert.deepEqual(validateMarketContractRow({ listing_id: 'portal-1' }, 'portal_apartments'), [])
assert.deepEqual(validateMarketContractRow({}, 'portal_houses'), ['source_record_id requerido'])

assert.deepEqual(validateMarketContractRow({
  event_key: 'cbrs-1',
  transaction_date: '2026-07-15',
  rol: '123-45',
  price_uf: 12000,
}, 'registered_sales'), [])

const invalidSale = validateMarketContractRow({ event_key: 'cbrs-2' }, 'registered_sales')
assert.equal(invalidSale.includes('transaction_date requerida'), true)
assert.equal(invalidSale.includes('rol o dirección requerido para identificar el activo'), true)
assert.equal(invalidSale.includes('precio positivo en UF o CLP requerido'), true)

assert.deepEqual(validateMarketContractRow({
  event_key: 'client-1',
  fecha: '2026-06-30',
  direccion: 'Av. Vitacura 1000',
  precio_clp: 500000000,
}, 'client_sales'), [])

assert.deepEqual(validateMarketContractRow({
  name: 'Lo Curro',
  geometry: { type: 'Polygon', coordinates: [] },
}, 'kml_neighborhoods'), [])
assert.equal(validateMarketContractRow({ name: 'Lo Curro' }, 'kml_neighborhoods').includes('geometry GeoJSON requerida'), true)

const houseSupplyCorrection = readFileSync(
  new URL('../supabase/migrations/20260902201500_market_house_supply_sales_built_area_basis.sql', import.meta.url),
  'utf8',
)
assert.match(houseSupplyCorrection, /raw_payload ->> 'built_area_m2'/)
assert.match(houseSupplyCorrection, /ll\.price_uf \/ ll\.built_area_m2/)
assert.doesNotMatch(houseSupplyCorrection, /order by r\.price_uf_m2/)
assert.match(houseSupplyCorrection, /does not classify price signals/)

console.log('Contractual source compatibility, market row validation and house UF/m2 basis verified.')
