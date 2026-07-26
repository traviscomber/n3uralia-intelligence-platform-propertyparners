import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  apartmentOfferWeightedUfM2,
  calculateDeterministicValuation,
  calculatePublicationScenarios,
  houseWeightedUfM2,
} from '../lib/valuation-model'

describe('valuation publication scenarios', () => {
  it('builds the commercial, 5% and 10% publication scenarios', () => {
    assert.deepEqual(calculatePublicationScenarios(15_890, 253.5), [
      { margin: 0, publicationUf: 15_890, weightedUfM2: 62.7 },
      { margin: 0.05, publicationUf: 16_726, weightedUfM2: 66 },
      { margin: 0.1, publicationUf: 17_656, weightedUfM2: 69.6 },
    ])
  })

  it('returns zero weighted values when effective area is unavailable', () => {
    assert.deepEqual(calculatePublicationScenarios(10_000, 0), [
      { margin: 0, publicationUf: 10_000, weightedUfM2: 0 },
      { margin: 0.05, publicationUf: 10_526, weightedUfM2: 0 },
      { margin: 0.1, publicationUf: 11_111, weightedUfM2: 0 },
    ])
  })

  it('sanitizes negative and non-finite scenario inputs', () => {
    assert.deepEqual(calculatePublicationScenarios(-1, Number.NaN), [
      { margin: 0, publicationUf: 0, weightedUfM2: 0 },
      { margin: 0.05, publicationUf: 0, weightedUfM2: 0 },
      { margin: 0.1, publicationUf: 0, weightedUfM2: 0 },
    ])
  })
})

describe('apartment valuation', () => {
  it('values useful area and weights terrace area at 50%', () => {
    const valuation = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: 227,
      terraceAreaM2: 53,
      appliedUsefulUfM2: 70,
    })

    assert.deepEqual(valuation, {
      propertyType: 'Departamento',
      effectiveAreaM2: 253.5,
      commercialValueUf: 15_890,
      commercialWeightedUfM2: 62.7,
      componentValues: [{ label: 'Superficie útil', valueUf: 15_890 }],
      scenarios: [
        { margin: 0, publicationUf: 15_890, weightedUfM2: 62.7 },
        { margin: 0.05, publicationUf: 16_726, weightedUfM2: 66 },
        { margin: 0.1, publicationUf: 17_656, weightedUfM2: 69.6 },
      ],
      method: 'Plantilla Departamentos: superficie útil x UF/m² aplicado; comparación ponderada con terraza al 50%.',
    })
  })

  it('sanitizes invalid apartment inputs instead of producing negative values', () => {
    const valuation = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: -100,
      terraceAreaM2: Number.POSITIVE_INFINITY,
      appliedUsefulUfM2: Number.NaN,
    })

    assert.equal(valuation.effectiveAreaM2, 0)
    assert.equal(valuation.commercialValueUf, 0)
    assert.equal(valuation.commercialWeightedUfM2, 0)
    assert.deepEqual(valuation.componentValues, [{ label: 'Superficie útil', valueUf: 0 }])
  })
})

describe('house valuation', () => {
  it('combines construction and land values while weighting land area at 25%', () => {
    const valuation = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 200,
      landAreaM2: 800,
      builtUfM2: 50,
      landUfM2: 10,
    })

    assert.deepEqual(valuation, {
      propertyType: 'Casa',
      effectiveAreaM2: 400,
      commercialValueUf: 18_000,
      commercialWeightedUfM2: 45,
      componentValues: [
        { label: 'Construcción', valueUf: 10_000 },
        { label: 'Terreno', valueUf: 8_000 },
      ],
      scenarios: [
        { margin: 0, publicationUf: 18_000, weightedUfM2: 45 },
        { margin: 0.05, publicationUf: 18_947, weightedUfM2: 47.4 },
        { margin: 0.1, publicationUf: 20_000, weightedUfM2: 50 },
      ],
      method: 'Plantilla Casas: construcción x UF/m² + terreno x UF/m²; comparación ponderada con terreno al 25%.',
    })
  })

  it('sanitizes invalid house inputs independently by component', () => {
    const valuation = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 100,
      landAreaM2: -800,
      builtUfM2: 40,
      landUfM2: Number.POSITIVE_INFINITY,
    })

    assert.equal(valuation.effectiveAreaM2, 100)
    assert.equal(valuation.commercialValueUf, 4_000)
    assert.equal(valuation.commercialWeightedUfM2, 40)
    assert.deepEqual(valuation.componentValues, [
      { label: 'Construcción', valueUf: 4_000 },
      { label: 'Terreno', valueUf: 0 },
    ])
  })
})

describe('comparable weighted UF/m² helpers', () => {
  it('weights apartment terrace area at 50%', () => {
    assert.equal(Number(apartmentOfferWeightedUfM2(14_200, 220, 250).toFixed(6)), 60.425532)
  })

  it('does not subtract area when apartment total area is below useful area', () => {
    assert.equal(apartmentOfferWeightedUfM2(10_000, 100, 80), 100)
  })

  it('weights house land area at 25%', () => {
    assert.equal(houseWeightedUfM2(18_000, 200, 800), 45)
  })

  it('returns zero when comparable effective area is unavailable', () => {
    assert.equal(apartmentOfferWeightedUfM2(10_000, 0, 0), 0)
    assert.equal(houseWeightedUfM2(10_000, 0, 0), 0)
  })
})
