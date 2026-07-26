import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  apartmentOfferWeightedUfM2,
  calculateDeterministicValuation,
  calculatePublicationScenarios,
  houseWeightedUfM2,
} from '../lib/valuation-model'

function assertNonNegativeFinite(values: number[]) {
  for (const value of values) {
    assert.equal(Number.isFinite(value), true)
    assert.equal(value >= 0, true)
  }
}

describe('valuation engine invariants', () => {
  it('keeps publication scenarios ordered by margin and price', () => {
    for (const commercialValueUf of [0, 1, 999.49, 10_000, 1_000_000]) {
      const scenarios = calculatePublicationScenarios(commercialValueUf, 250)

      assert.deepEqual(
        scenarios.map(({ margin }) => margin),
        [0, 0.05, 0.1],
      )
      assert.equal(scenarios[0].publicationUf <= scenarios[1].publicationUf, true)
      assert.equal(scenarios[1].publicationUf <= scenarios[2].publicationUf, true)
      assert.equal(scenarios[0].weightedUfM2 <= scenarios[1].weightedUfM2, true)
      assert.equal(scenarios[1].weightedUfM2 <= scenarios[2].weightedUfM2, true)
    }
  })

  it('never produces negative or non-finite outputs for bounded inputs', () => {
    const apartment = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: 10_000,
      terraceAreaM2: 5_000,
      appliedUsefulUfM2: 10_000,
    })
    const house = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 10_000,
      landAreaM2: 1_000_000,
      builtUfM2: 10_000,
      landUfM2: 1_000,
    })

    for (const valuation of [apartment, house]) {
      assertNonNegativeFinite([
        valuation.effectiveAreaM2,
        valuation.commercialValueUf,
        valuation.commercialWeightedUfM2,
        ...valuation.componentValues.map(({ valueUf }) => valueUf),
        ...valuation.scenarios.flatMap(({ publicationUf, weightedUfM2 }) => [publicationUf, weightedUfM2]),
      ])
    }
  })
})

describe('valuation monotonicity', () => {
  it('does not reduce apartment value when the applied UF/m² increases', () => {
    let previousValue = -1

    for (const appliedUsefulUfM2 of [0, 10, 25.5, 50, 100, 250]) {
      const valuation = calculateDeterministicValuation({
        propertyType: 'Departamento',
        usefulAreaM2: 120,
        terraceAreaM2: 30,
        appliedUsefulUfM2,
      })

      assert.equal(valuation.commercialValueUf >= previousValue, true)
      previousValue = valuation.commercialValueUf
    }
  })

  it('does not reduce house value when either component rate increases', () => {
    const baseline = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 200,
      landAreaM2: 800,
      builtUfM2: 40,
      landUfM2: 8,
    })
    const higherConstructionRate = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 200,
      landAreaM2: 800,
      builtUfM2: 41,
      landUfM2: 8,
    })
    const higherLandRate = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 200,
      landAreaM2: 800,
      builtUfM2: 40,
      landUfM2: 9,
    })

    assert.equal(higherConstructionRate.commercialValueUf > baseline.commercialValueUf, true)
    assert.equal(higherLandRate.commercialValueUf > baseline.commercialValueUf, true)
  })
})

describe('valuation rounding contract', () => {
  it('rounds commercial values to whole UF and weighted metrics to one decimal', () => {
    const valuation = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: 101.25,
      terraceAreaM2: 13.5,
      appliedUsefulUfM2: 63.333,
    })

    assert.equal(Number.isInteger(valuation.commercialValueUf), true)
    assert.equal(valuation.effectiveAreaM2, 108)
    assert.equal(valuation.commercialWeightedUfM2, 59.4)

    for (const scenario of valuation.scenarios) {
      assert.equal(Number.isInteger(scenario.publicationUf), true)
      assert.equal(Number((scenario.weightedUfM2 * 10).toFixed(8)) % 1, 0)
    }
  })

  it('keeps helper calculations unrounded for downstream precision', () => {
    assert.equal(apartmentOfferWeightedUfM2(1, 3, 4), 1 / 3.5)
    assert.equal(houseWeightedUfM2(1, 3, 4), 1 / 4)
  })
})

describe('valuation scaling properties', () => {
  it('scales apartment commercial value linearly with useful area', () => {
    const base = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: 100,
      terraceAreaM2: 20,
      appliedUsefulUfM2: 60,
    })
    const doubled = calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2: 200,
      terraceAreaM2: 40,
      appliedUsefulUfM2: 60,
    })

    assert.equal(doubled.commercialValueUf, base.commercialValueUf * 2)
    assert.equal(doubled.effectiveAreaM2, base.effectiveAreaM2 * 2)
    assert.equal(doubled.commercialWeightedUfM2, base.commercialWeightedUfM2)
  })

  it('preserves house weighted UF/m² when all areas and value components scale equally', () => {
    const base = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 150,
      landAreaM2: 600,
      builtUfM2: 45,
      landUfM2: 9,
    })
    const tripled = calculateDeterministicValuation({
      propertyType: 'Casa',
      builtAreaM2: 450,
      landAreaM2: 1_800,
      builtUfM2: 45,
      landUfM2: 9,
    })

    assert.equal(tripled.commercialValueUf, base.commercialValueUf * 3)
    assert.equal(tripled.effectiveAreaM2, base.effectiveAreaM2 * 3)
    assert.equal(tripled.commercialWeightedUfM2, base.commercialWeightedUfM2)
  })
})
