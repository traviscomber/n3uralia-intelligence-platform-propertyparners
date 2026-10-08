import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateCanonicalComparableUfM2, calculateContractualValuation, type ValuationComparable, type ValuationSubject } from '../../lib/valuation-contract'

const factors = { condition: 0, remodeling: 0, orientation: 0, floor: 0, light: 0, view: 0, noise: 0, commercialPotential: 0 }
function comparable(id: string, overrides: Partial<ValuationComparable> = {}): ValuationComparable {
  return { id, sourceType: 'Portal', sourceReference: id, address: 'Vitacura', neighborhood: 'Vitacura', propertyType: 'Departamento',
    usefulAreaM2: 100, totalAreaM2: 120, priceUf: 12_000, priceUfM2: 0, similarityScore: 1, adjustmentPct: 0, selected: true, ...overrides }
}
function subject(overrides: Partial<ValuationSubject> = {}): ValuationSubject {
  return { propertyType: 'Departamento', address: 'Vitacura', neighborhood: 'Vitacura', usefulAreaM2: 100, terraceAreaM2: 20, usefulRateUfM2: 100, ...overrides }
}

test('department value, publication scenarios and weighted area are consistent', () => {
  const result = calculateContractualValuation(subject(), [comparable('1'), comparable('2'), comparable('3')], factors)
  assert.equal(result.baseValueUf, 10_000)
  assert.equal(result.adjustedValueUf, 10_000)
  assert.equal(result.portalSummary.medianUfM2, 12_000 / 110)
  assert.equal(result.publicationScenarios[0].suggestedUfM2, 10_000 / 110)
  assert.ok(Math.abs(result.publicationScenarios[1].suggestedPriceUf - 10_000 / 0.95) < 1e-8)
  assert.ok(Math.abs(result.publicationScenarios[2].suggestedPriceUf - 10_000 / 0.9) < 1e-8)
})
test('CBRS registered area is not relabeled as useful area', () => {
  assert.equal(calculateCanonicalComparableUfM2(comparable('cbrs',{sourceType:'CBRS', usefulAreaM2:undefined, builtAreaM2:120})),100)
})
test('incomplete area is not accepted among three valid comparables', () => {
  assert.throws(() => calculateContractualValuation(subject(), [
    comparable('1'), comparable('2'), comparable('3',{usefulAreaM2:undefined,totalAreaM2:120}),
  ], factors), /al menos tres comparables con superficies/)
})
test('house formula sums built and land components without unintended adjustments', () => {
  const houseSubject: ValuationSubject = {propertyType:'Casa',address:'Vitacura',neighborhood:'Vitacura',builtAreaM2:200,landAreaM2:400,builtRateUfM2:70,landRateUfM2:12}
  const houses=[1,2,3].map(i=>comparable(String(i),{propertyType:'Casa',builtAreaM2:200,landAreaM2:400,priceUf:18_800}))
  const result=calculateContractualValuation(houseSubject,houses,factors)
  assert.equal(result.baseValueUf,18_800)
  assert.equal(result.commercialUfM2,18_800/300)
  assert.equal(result.qualitativeAdjustmentPct,0)
})
test('missing department valuation rate cannot produce a result', () => {
  assert.throws(() => calculateContractualValuation(subject({usefulRateUfM2:undefined}), [comparable('1'),comparable('2'),comparable('3')],factors),/se requieren m² útiles/)
})
