import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeCanonicalMarketGeometry } from '../../lib/market-territory'

test('acepta polígonos canónicos con coordenadas finitas', () => {
  const geometry = normalizeCanonicalMarketGeometry({
    type: 'MultiPolygon',
    coordinates: [[[[-70.6, -33.4], [-70.5, -33.4], [-70.6, -33.4]]]],
  })

  assert.equal(geometry?.type, 'MultiPolygon')
  assert.deepEqual(geometry?.coordinates, [[[[-70.6, -33.4], [-70.5, -33.4], [-70.6, -33.4]]]])
})

test('rechaza geometrías que no representan barrios', () => {
  assert.equal(normalizeCanonicalMarketGeometry({
    type: 'Point',
    coordinates: [-70.6, -33.4],
  }), null)
})

test('rechaza polígonos sin coordenadas válidas', () => {
  assert.equal(normalizeCanonicalMarketGeometry({
    type: 'Polygon',
    coordinates: [[['-70.6', null]]],
  }), null)
})
