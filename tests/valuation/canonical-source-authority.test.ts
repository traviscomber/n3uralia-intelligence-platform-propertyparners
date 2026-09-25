import assert from 'node:assert/strict'
import { test } from 'node:test'
import canonical from '../../data/canonical/valuation-intelligence.json'
import {
  apartmentOfferWeightedUfM2,
  calculateDeterministicValuation,
  calculatePublicationScenarios,
  houseWeightedUfM2,
} from '../../lib/valuation-model'

test('canonical valuation source hashes and universes are fixed', () => {
  const templates = canonical.sourceInventory.valuationTemplates
  assert.equal(templates.find((item) => item.file === 'Plantilla de Valorización Casas.xlsx')?.sha256,
    'b8e68128f76d1144f7bf8ef4c9244774f4baf9d7508559e8bbde3c1586254d1d')
  assert.equal(templates.find((item) => item.file === 'Plantilla de Valorización Departamentos.xlsx')?.sha256,
    'c71c7441de75da94cb4d661b639634db5026f4d1000cba9f9ab47c6d23114555')

  const market = canonical.sourceInventory.marketEvidence
  assert.equal(market.find((item) => item.code === 'cbrs_vitacura_canonical_2014_2026')?.residentialCompraventaEvents, 17581)
  assert.equal(market.find((item) => item.code === 'portal_canonical_houses_2026_03_09')?.validRows, 1731)
  assert.equal(market.find((item) => item.code === 'portal_canonical_departments_2026_03_09')?.validRows, 3440)
  assert.equal(market.find((item) => item.code === 'portal_canonical_projects_2026_03_09')?.validRows, 26)
  assert.equal(market.find((item) => item.code === 'kml_vitacura_barrios_2026_08_12')?.neighborhoods, 19)
})

test('canonical publication ladder is 0/5/10 using margin inversion', () => {
  assert.deepEqual(canonical.methodology.publication.scenariosPct, [0, 5, 10])
  const scenarios = calculatePublicationScenarios(15890, 253.5)
  assert.deepEqual(scenarios.map((item) => item.publicationUf), [15890, 16726, 17656])
})

test('canonical house and apartment mathematics reproduce source rules', () => {
  assert.equal(houseWeightedUfM2(24000, 200, 800), 60)
  assert.ok(Math.abs(apartmentOfferWeightedUfM2(15890, 227, 280) - 62.68244575936884) < 1e-9)

  const apartment = calculateDeterministicValuation({
    propertyType: 'Departamento',
    usefulAreaM2: 227,
    terraceAreaM2: 53,
    appliedUsefulUfM2: 70,
  })
  assert.equal(apartment.commercialValueUf, canonical.historicalTemplateFixture.commercialValueUf)
  assert.equal(apartment.effectiveAreaM2, canonical.historicalTemplateFixture.effectiveAreaM2)
})

test('canonical comparable and qualitative policies fail closed', () => {
  assert.equal(canonical.comparablesPolicy.technicalMinimumSelected, 3)
  assert.equal(canonical.comparablesPolicy.normalReliableMaximum, 5)
  assert.equal(canonical.comparablesPolicy.automaticOutlierDeletion, false)
  assert.equal(canonical.qualitativePolicy.currentCanonicalBehavior, 'review_evidence_only_no_automatic_economic_adjustment')
})

test('advanced intelligence remains advisory and cannot own canonical price', () => {
  assert.ok(canonical.canonicalVsAdvisory.advisoryOrShadow.includes('ML shadow predictions'))
  assert.ok(canonical.canonicalVsAdvisory.advisoryOrShadow.includes('topography evidence'))
  assert.match(canonical.canonicalVsAdvisory.guardrail, /must not silently overwrite/i)
})
