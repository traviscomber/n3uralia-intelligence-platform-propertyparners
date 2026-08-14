import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateDeterministicValuation,
  calculatePublicationScenarios,
  apartmentOfferWeightedUfM2,
  houseWeightedUfM2,
} from '../../lib/valuation-model'
import {
  calculateContractualValuation,
  calculateQualitativeAdjustment,
  similarityScoreToWeight,
  type QualitativeFactors,
  type ValuationComparable,
} from '../../lib/valuation-contract'

const neutralFactors: QualitativeFactors = {
  condition: 0,
  remodeling: 0,
  orientation: 0,
  floor: 0,
  light: 0,
  view: 0,
  noise: 0,
  commercialPotential: 0,
}

const comparable = (id: string, priceUfM2: number, similarityScore: number, selected = true): ValuationComparable => ({
  id,
  sourceType: 'CBRS',
  sourceReference: id,
  address: 'Canonical fixture',
  neighborhood: 'Vitacura',
  propertyType: 'Departamento',
  priceUf: priceUfM2 * 100,
  priceUfM2,
  similarityScore,
  selected,
  adjustmentPct: 0,
})

test('Navidad 1427: 227 útiles, 53 terraza y 70 UF/m² produce 15.890 UF', () => {
  const result = calculateDeterministicValuation({
    propertyType: 'Departamento',
    usefulAreaM2: 227,
    terraceAreaM2: 53,
    appliedUsefulUfM2: 70,
  })

  assert.equal(result.commercialValueUf, 15890)
  assert.equal(result.effectiveAreaM2, 253.5)
  assert.equal(result.commercialWeightedUfM2, 62.7)
  assert.deepEqual(result.scenarios.map((scenario) => scenario.publicationUf), [15890, 16726, 17656])
})

test('Publication scenarios use margin inversion, not multiplication', () => {
  const scenarios = calculatePublicationScenarios(15890, 253.5)
  assert.deepEqual(scenarios.map((scenario) => scenario.margin), [0, 0.05, 0.1])
  assert.equal(scenarios[1].publicationUf, Math.round(15890 / 0.95))
  assert.equal(scenarios[2].publicationUf, Math.round(15890 / 0.9))
  assert.notEqual(scenarios[1].publicationUf, Math.round(15890 * 1.05))
})

test('Casa uses built area plus 25 percent of land area', () => {
  const result = calculateDeterministicValuation({
    propertyType: 'Casa',
    builtAreaM2: 200,
    landAreaM2: 800,
    builtUfM2: 40,
    landUfM2: 20,
  })

  assert.equal(result.effectiveAreaM2, 400)
  assert.equal(result.commercialValueUf, 24000)
  assert.equal(houseWeightedUfM2(24000, 200, 800), 60)
})

test('Apartment offer weighting uses useful area plus half the excess area', () => {
  assert.ok(Math.abs(apartmentOfferWeightedUfM2(15890, 227, 280) - 62.68244575936884) < 1e-9)
})

test('Similarity is canonical 0-1 and rejects percentages', () => {
  assert.equal(similarityScoreToWeight(0.85), 0.85)
  assert.throws(() => similarityScoreToWeight(85), /0 a 1/)
})

test('Qualitative adjustment is bounded to plus or minus 35 percent', () => {
  assert.equal(calculateQualitativeAdjustment({ ...neutralFactors, condition: 100 }), 35)
  assert.equal(calculateQualitativeAdjustment({ ...neutralFactors, condition: -100 }), -35)
})

test('Contractual valuation recalculates from selected comparables only', () => {
  const result = calculateContractualValuation(
    {
      propertyType: 'Departamento',
      address: 'Navidad 1427',
      neighborhood: 'Las Nieves',
      usefulAreaM2: 227,
      terraceAreaM2: 53,
    },
    [comparable('low', 55, 0.7), comparable('mid', 70, 0.95), comparable('high', 90, 0.9), comparable('excluded', 999, 1, false)],
    neutralFactors,
  )

  assert.equal(result.comparableCount, 3)
  assert.equal(result.baseUfM2, 70)
  assert.equal(result.baseValueUf, 17745)
  assert.equal(result.adjustedValueUf, 17745)
})

test('Contractual valuation requires at least two selected comparables', () => {
  assert.throws(() => calculateContractualValuation(
    { propertyType: 'Departamento', address: 'x', neighborhood: 'x', usefulAreaM2: 100, terraceAreaM2: 0 },
    [comparable('only', 70, 1)],
    neutralFactors,
  ), /al menos dos comparables/)
})

test('CBRS Espoz 4233 DP 204 canonical evidence remains traceable', () => {
  const evidence = {
    sourceType: 'CBRS',
    sourceReference: 'ROL 499-8',
    address: 'Espoz 4233 DP 204',
    neighborhood: 'Nueva Costanera',
    transactionDate: '2026-01-06',
    priceUf: 16800,
    latitude: -33.397934,
    longitude: -70.590406,
  }

  assert.equal(evidence.sourceType, 'CBRS')
  assert.equal(evidence.sourceReference, 'ROL 499-8')
  assert.equal(evidence.priceUf, 16800)
  assert.equal(evidence.transactionDate, '2026-01-06')
  assert.ok(Math.abs(evidence.latitude) > 33)
  assert.ok(Math.abs(evidence.longitude) > 70)
})

console.log('[v0] Canonical valuation mathematics tests loaded')
