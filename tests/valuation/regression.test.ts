import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildValuationReportPayload,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationResult,
  type ValuationSubject,
} from '../../lib/valuation-contract'

const factors: QualitativeFactors = {
  condition: 0,
  remodeling: 0,
  orientation: 0,
  floor: 0,
  light: 0,
  view: 0,
  noise: 0,
  commercialPotential: 0,
}

const subject: ValuationSubject = {
  propertyType: 'Departamento',
  address: 'Navidad 1427',
  neighborhood: 'Las Nieves',
  usefulAreaM2: 227,
  terraceAreaM2: 53,
  bedrooms: undefined,
  bathrooms: undefined,
  parkingSpaces: undefined,
  constructionYear: undefined,
}

const comparable: ValuationComparable = {
  id: 'cbrs-esp-4233-dp-204',
  sourceType: 'CBRS',
  sourceReference: 'ROL 499-8',
  address: 'ESPOZ 4233 DP 204 P 2',
  propertyType: 'Departamento',
  builtAreaM2: 161,
  neighborhood: 'Nueva Costanera',
  transactionDate: '2026-01-06',
  priceUf: 16800,
  priceUfM2: 104.35,
  similarityScore: 0.95,
  selected: true,
  adjustmentPct: 0,
}

const result: ValuationResult = {
  baseUfM2: 62.7,
  baseValueUf: 15890,
  qualitativeAdjustmentPct: 0,
  adjustedValueUf: 15890,
  lowValueUf: 15890,
  highValueUf: 15890,
  comparableCount: 1,
  portalSummary: {
    count: 0,
    minPriceUf: null,
    averagePriceUf: null,
    medianPriceUf: null,
    maxPriceUf: null,
    minUfM2: null,
    averageUfM2: null,
    medianUfM2: null,
    maxUfM2: null,
  },
  cbrsSummary: {
    count: 1,
    minPriceUf: 16800,
    averagePriceUf: 16800,
    medianPriceUf: 16800,
    maxPriceUf: 16800,
    minUfM2: 104.35,
    averageUfM2: 104.35,
    medianUfM2: 104.35,
    maxUfM2: 104.35,
  },
  commercialUfM2: 62.7,
  salePriceVarianceVsCbrsMaxPct: -0.0542,
  salePriceVarianceVsCbrsAveragePct: -0.0542,
  saleUfM2VarianceVsCbrsMaxPct: -0.3991,
  saleUfM2VarianceVsCbrsAveragePct: -0.3991,
  publicationScenarios: [],
  warnings: [],
  methodologyVersion: 'property-partners-valuation-v2',
  justification: 'Canonical regression result',
}

test('Report payload keeps only selected comparables and preserves traceability', () => {
  const payload = buildValuationReportPayload(subject, [comparable, { ...comparable, id: 'excluded', selected: false }], factors, result)

  assert.equal(payload.methodologyVersion, 'property-partners-valuation-v2')
  assert.equal(payload.comparables.length, 1)
  assert.equal(payload.comparables[0].sourceReference, 'ROL 499-8')
  assert.equal(payload.comparables[0].transactionDate, '2026-01-06')
  assert.equal(payload.comparables[0].canonicalUfM2, 104.35)
})

test('Unknown property facts remain undefined rather than fabricated zeroes', () => {
  assert.equal(subject.bedrooms, undefined)
  assert.equal(subject.bathrooms, undefined)
  assert.equal(subject.parkingSpaces, undefined)
  assert.equal(subject.constructionYear, undefined)
})

test('Report payload includes human-review disclosure', () => {
  const payload = buildValuationReportPayload(subject, [comparable], factors, result)
  assert.match(payload.disclosure, /revisión humana/)
})
