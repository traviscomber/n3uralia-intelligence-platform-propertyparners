import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVitacuraSearchUrl, VITACURA_BBOX } from '../../lib/mercadolibre-vitacura-collector'

test('builds a Vitacura-only Mercado Libre search URL', () => {
  const path = buildVitacuraSearchUrl({
    categoryId: 'MLC_TEST_SALE_HOUSES',
    limit: 5,
    offset: 0,
  })
  const url = new URL(`https://api.mercadolibre.com${path}`)

  assert.equal(url.pathname, '/sites/MLC/search')
  assert.equal(url.searchParams.get('category'), 'MLC_TEST_SALE_HOUSES')
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('offset'), '0')
  assert.equal(url.searchParams.get('sort'), 'price_asc')
  assert.equal(
    url.searchParams.get('item_location'),
    `lat:${VITACURA_BBOX.south}_${VITACURA_BBOX.north},lon:${VITACURA_BBOX.west}_${VITACURA_BBOX.east}`,
  )
})

test('adds an optional price range without changing the geographic scope', () => {
  const path = buildVitacuraSearchUrl({
    categoryId: 'MLC_TEST_SALE_HOUSES',
    limit: 20,
    offset: 50,
    minPrice: 5_000,
    maxPrice: 10_000,
  })
  const url = new URL(`https://api.mercadolibre.com${path}`)

  assert.equal(url.searchParams.get('price'), '5000-10000')
  assert.equal(url.searchParams.get('offset'), '50')
  assert.match(url.searchParams.get('item_location') ?? '', /^lat:/)
})
