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
  address: 'Espoz 4233 DP 204',
  neighborhood: 'Nueva Costanera',
  transactionDate: '2026-01-06',
  priceUf: 16800,
  priceUfM2: 70,
  similarityScore: 0.95,
  selected: true,
  adjustmentPct: 0,
}

const result: ValuationResult = {
  baseUfM2: 62.7,
  baseValueUf: 15890,
  qualitativeAdjustmentPct: 0,
  adjustedValueUf: 15890,
  lowValueUf: 15100.5,
  highValueUf: 16684.5,
  comparableCount: 1,
  justification: 'Canonical regression result',
}

test('Report payload keeps only selected comparables and preserves traceability', () => {
  const payload = buildValuationReportPayload(subject, [comparable, { ...comparable, id: 'excluded', selected: false }], factors, result)

  assert.equal(payload.methodologyVersion, 'valuation-contract-v1')
  assert.equal(payload.similarityScale, '0-1')
  assert.equal(payload.comparables.length, 1)
  assert.equal(payload.comparables[0].sourceReference, 'ROL 499-8')
  assert.equal(payload.comparables[0].transactionDate, '2026-01-06')
})

test('Unknown property facts remain undefined rather than fabricated zeroes', () => {
  assert.equal(subject.bedrooms, undefined)
  assert.equal(subject.bathrooms, undefined)
  assert.equal(subject.parkingSpaces, undefined)
  assert.equal(subject.constructionYear, undefined)
})

test('Report payload includes human-review disclosure', () => {
  const payload = buildValuationReportPayload(subject, [comparable], factors, result)
  assert.match(payload.disclosure, /revisión y aprobación humana/)
})
