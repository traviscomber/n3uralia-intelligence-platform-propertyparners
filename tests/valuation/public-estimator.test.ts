import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicCoverageOptions,
  buildPublicValuationEstimate,
  buildPublicVitacuraCoverageOptions,
  type PublicValuationEvidenceRow,
} from '../../lib/public-valuation'

function row(
  neighborhood: string,
  priceUfM2: number,
  builtAreaM2 = 200,
  bedrooms: number | null = 4,
  bathrooms: number | null = 3,
): PublicValuationEvidenceRow {
  return {
    neighborhood,
    propertyType: 'Casa',
    priceUfM2,
    builtAreaM2,
    bedrooms,
    bathrooms,
    observedAt: '2026-09-02T12:00:00.000Z',
  }
}

test('does not publish an estimate when the complete Vitacura evidence floor is not met', () => {
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

test('publishes a robust sector median and interquartile range with sufficient evidence', () => {
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
  assert.equal(estimate.sectorSampleCount, 5)
  assert.equal(estimate.coverageLevel, 'sector')
  assert.equal(estimate.referenceArea, 'Santa María')
  assert.equal(estimate.methodology, 'median-active-offer-built-uf-m2')
})

test('falls back to the Vitacura-wide pool without lowering the five-observation floor', () => {
  const rows = [
    row('Lo Curro', 90),
    row('Lo Curro', 100),
    row('Santa María', 110),
    row('Santa María', 120),
    row('Club de Polo', 130),
    row('La Llavería', 140),
  ]

  const estimate = buildPublicValuationEstimate(rows, {
    neighborhood: 'Lo Curro',
    propertyType: 'Casa',
    builtAreaM2: 200,
  })

  assert.ok(estimate)
  assert.equal(estimate.coverageLevel, 'vitacura')
  assert.equal(estimate.referenceArea, 'Vitacura')
  assert.equal(estimate.sectorSampleCount, 2)
  assert.equal(estimate.marketSampleCount, 6)
  assert.equal(estimate.sampleCount, 6)
  assert.equal(estimate.estimateUf, 23000)
})

test('Vitacura coverage catalog keeps all canonical sectors and labels the evidence level', () => {
  const rows = [
    ...[90, 95, 100, 105, 110].map((rate) => row('Club de Polo', rate)),
    ...[120, 125, 130, 135].map((rate) => row('Jardín del Este', rate)),
  ]

  assert.deepEqual(
    buildPublicVitacuraCoverageOptions(rows, ['Jardín del Este', 'Club de Polo', 'Lo Curro']),
    [
      { neighborhood: 'Club de Polo', sampleCount: 5, coverageLevel: 'sector' },
      { neighborhood: 'Jardín del Este', sampleCount: 4, coverageLevel: 'vitacura' },
      { neighborhood: 'Lo Curro', sampleCount: 0, coverageLevel: 'vitacura' },
    ],
  )
})

test('sparse optional bedroom data cannot collapse an otherwise valid public estimate', () => {
  const rows = [
    row('Santa María', 90, 200, 4, 3),
    row('Santa María', 100, 200, null, 3),
    row('Santa María', 110, 200, null, 3),
    row('Santa María', 120, 200, null, 3),
    row('Santa María', 130, 200, null, 3),
    row('Santa María', 140, 200, null, 3),
  ]

  const estimate = buildPublicValuationEstimate(rows, {
    neighborhood: 'Santa María',
    propertyType: 'Casa',
    builtAreaM2: 200,
    bedrooms: 4,
  })

  assert.ok(estimate)
  assert.equal(estimate.sampleCount, 6)
})
