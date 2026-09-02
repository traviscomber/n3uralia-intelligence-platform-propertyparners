import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicCoverageOptions,
  buildPublicValuationEstimate,
  type PublicValuationEvidenceRow,
} from '../../lib/public-valuation'

function row(neighborhood: string, priceUfM2: number, builtAreaM2 = 200): PublicValuationEvidenceRow {
  return {
    neighborhood,
    propertyType: 'Casa',
    priceUfM2,
    builtAreaM2,
    bedrooms: 4,
    bathrooms: 3,
    observedAt: '2026-09-02T12:00:00.000Z',
  }
}

test('does not publish an estimate below the minimum evidence floor', () => {
  const rows = [row('Lo Curro', 95), row('Lo Curro', 100), row('Lo Curro', 105), row('Lo Curro', 110)]
  const estimate = buildPublicValuationEstimate(rows, {
    neighborhood: 'Lo Curro',
    propertyType: 'Casa',
    builtAreaM2: 200,
    bedrooms: 4,
    bathrooms: 3,
  })

  assert.equal(estimate, null)
  assert.deepEqual(buildPublicCoverageOptions(rows), [])
})

test('publishes a robust median and interquartile range with sufficient evidence', () => {
  const rows = [90, 100, 110, 120, 130].map((rate) => row('Santa María', rate))
  const estimate = buildPublicValuationEstimate(rows, {
    neighborhood: 'Santa María',
    propertyType: 'Casa',
    builtAreaM2: 200,
    bedrooms: 4,
    bathrooms: 3,
  })

  assert.ok(estimate)
  assert.equal(estimate.estimateUf, 22000)
  assert.equal(estimate.lowUf, 20000)
  assert.equal(estimate.highUf, 24000)
  assert.equal(estimate.sampleCount, 5)
  assert.equal(estimate.marketSampleCount, 5)
  assert.equal(estimate.methodology, 'median-active-offer-uf-m2')
})

test('coverage exposes only neighborhoods meeting the evidence floor', () => {
  const rows = [
    ...[90, 95, 100, 105, 110].map((rate) => row('Club de Polo', rate)),
    ...[120, 125, 130, 135].map((rate) => row('Jardín del Este', rate)),
  ]

  assert.deepEqual(buildPublicCoverageOptions(rows), [{ neighborhood: 'Club de Polo', sampleCount: 5 }])
})
