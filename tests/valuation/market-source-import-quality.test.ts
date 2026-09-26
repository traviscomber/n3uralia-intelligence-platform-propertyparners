import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPortalUfConversion, normalizePortalListingRows } from '../../lib/market-source-import'

test('house card area remains raw evidence instead of canonical built/useful area', () => {
  const [row] = normalizePortalListingRows([{
    url: 'https://portalinmobiliario.com/MLC-123-casa-vitacura-_JM',
    precio: 25000,
    m2_util_card: 850,
    dorm_card: 4,
    banos_card: 3,
  }], 'portal_houses')

  assert.equal(row.useful_area_m2, null)
  assert.equal(row.built_area_m2, null)
  assert.equal(row.raw_useful_area, 850)
  assert.ok(row.normalization_flags?.includes('house_card_area_semantics_unresolved'))
})

test('apartment total area inconsistent with useful area is quarantined', () => {
  const [row] = normalizePortalListingRows([{
    url: 'https://portalinmobiliario.com/MLC-456-departamento-vitacura-_JM',
    precio: 15000,
    m2_util: 120,
    m2_total: 1770,
  }], 'portal_apartments')

  assert.equal(row.useful_area_m2, 120)
  assert.equal(row.built_area_m2, null)
  assert.ok(row.normalization_flags?.includes('apartment_total_area_inconsistent_with_useful_area'))
})

test('CLP price is converted to UF with the daily indicator supplied by ingestion', () => {
  const rows = normalizePortalListingRows([{
    url: 'https://portalinmobiliario.com/MLC-789-departamento-vitacura-_JM',
    precio: 600000000,
    m2_util: 200,
  }], 'portal_apartments')
  const [row] = applyPortalUfConversion(rows, 40000)

  assert.equal(row.price_clp, 600000000)
  assert.equal(row.price_uf, 15000)
  assert.equal(row.price_uf_m2, 75)
  assert.equal(row.uf_clp_at_observation, 40000)
  assert.ok(row.normalization_flags?.includes('price_converted_clp_to_uf_daily_indicator'))
  assert.ok(!row.normalization_flags?.includes('price_interpreted_clp_by_magnitude'))
})
