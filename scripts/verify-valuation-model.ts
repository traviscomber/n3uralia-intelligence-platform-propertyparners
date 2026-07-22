import assert from 'node:assert/strict'
import { apartmentOfferWeightedUfM2, calculateDeterministicValuation, houseWeightedUfM2 } from '../lib/valuation-model'

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

console.log('Valuation model verified against the supplied apartment formulas and an independently calculated house case.')
