import assert from 'node:assert/strict'
import { apartmentOfferWeightedUfM2, calculateDeterministicValuation, houseWeightedUfM2 } from '../lib/valuation-model'
import { calculateContractualValuation, similarityScoreToWeight } from '../lib/valuation-contract'

const apartment = calculateDeterministicValuation({
  propertyType: 'Departamento',
  usefulAreaM2: 227,
  terraceAreaM2: 53,
  appliedUsefulUfM2: 70,
})

assert.equal(apartment.effectiveAreaM2, 253.5)
assert.equal(apartment.commercialValueUf, 15890)
assert.equal(apartment.commercialWeightedUfM2, 62.7)
assert.deepEqual(apartment.scenarios.map((scenario) => scenario.publicationUf), [15890, 16726, 17656])
assert.equal(Number(apartmentOfferWeightedUfM2(14200, 220, 250).toFixed(6)), 60.425532)

const house = calculateDeterministicValuation({
  propertyType: 'Casa',
  builtAreaM2: 200,
  landAreaM2: 800,
  builtUfM2: 50,
  landUfM2: 10,
})

assert.equal(house.effectiveAreaM2, 400)
assert.equal(house.commercialValueUf, 18000)
assert.equal(house.commercialWeightedUfM2, 45)
assert.equal(houseWeightedUfM2(18000, 200, 800), 45)

assert.equal(similarityScoreToWeight(0.95), 0.95)
assert.equal(similarityScoreToWeight(0.62), 0.62)
assert.equal(similarityScoreToWeight(0), 0.1)
assert.throws(() => similarityScoreToWeight(62), /escala de 0 a 1/)

const weighted = calculateContractualValuation(
  {
    propertyType: 'Departamento',
    address: 'Caso de prueba',
    neighborhood: 'Vitacura',
    usefulAreaM2: 100,
    terraceAreaM2: 0,
  },
  [
    { id: 'a', sourceType: 'Portal', sourceReference: 'a', address: 'a', neighborhood: 'Vitacura', propertyType: 'Departamento', priceUf: 5000, priceUfM2: 50, similarityScore: 0.95, selected: true, adjustmentPct: 0 },
    { id: 'b', sourceType: 'Portal', sourceReference: 'b', address: 'b', neighborhood: 'Vitacura', propertyType: 'Departamento', priceUf: 7000, priceUfM2: 70, similarityScore: 0.78, selected: true, adjustmentPct: 0 },
    { id: 'c', sourceType: 'Portal', sourceReference: 'c', address: 'c', neighborhood: 'Vitacura', propertyType: 'Departamento', priceUf: 9000, priceUfM2: 90, similarityScore: 0.62, selected: true, adjustmentPct: 0 },
  ],
  { condition: 0, remodeling: 0, orientation: 0, floor: 0, light: 0, view: 0, noise: 0, commercialPotential: 0 },
)
assert.equal(weighted.baseUfM2, 70)

console.log('Valuation model verified against historical formulas and the canonical 0-1 similarity scale.')
