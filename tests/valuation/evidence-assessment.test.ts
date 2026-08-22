import test from 'node:test'
import assert from 'node:assert/strict'
import { assessValuationEvidence, type ValuationComparable } from '../../lib/valuation-contract'

function comparable(
  id: string,
  sourceType: ValuationComparable['sourceType'],
  priceUf: number,
  options: { dated?: boolean; distanced?: boolean } = {},
): ValuationComparable {
  return {
    id,
    sourceType,
    sourceReference: `source-${id}`,
    address: `Comparable ${id}`,
    neighborhood: 'Vitacura',
    propertyType: 'Departamento',
    transactionDate: options.dated ? '2026-08-01' : undefined,
    distanceMeters: options.distanced ? 450 : undefined,
    usefulAreaM2: 100,
    totalAreaM2: 100,
    priceUf,
    priceUfM2: priceUf / 100,
    similarityScore: 0,
    selected: true,
    adjustmentPct: 0,
  }
}

test('evidence assessment awards high confidence to diverse, tight and traceable evidence', () => {
  const assessment = assessValuationEvidence([
    comparable('sale-1', 'CBRS', 6000, { dated: true, distanced: true }),
    comparable('offer-1', 'Portal', 6300, { dated: true, distanced: true }),
    comparable('offer-2', 'Portal', 6600, { dated: true, distanced: true }),
  ])

  assert.equal(assessment.grade, 'Alta')
  assert.equal(assessment.score, 90)
  assert.equal(assessment.cbrsCount, 1)
  assert.equal(assessment.offerCount, 2)
  assert.equal(assessment.traceabilityPct, 100)
  assert.equal(assessment.risks.length, 0)
})

test('evidence assessment exposes single-source concentration without blocking arithmetic', () => {
  const assessment = assessValuationEvidence([
    comparable('offer-1', 'Portal', 6000, { dated: true, distanced: true }),
    comparable('offer-2', 'Portal', 6300, { dated: true, distanced: true }),
    comparable('offer-3', 'Portal', 6600, { dated: true, distanced: true }),
  ])

  assert.equal(assessment.grade, 'Media')
  assert.ok(assessment.risks.includes('Falta contraste con ventas CBRS.'))
  assert.match(assessment.summary, /sin ventas/)
})

test('evidence assessment flags wide dispersion and weak traceability', () => {
  const assessment = assessValuationEvidence([
    comparable('sale-1', 'CBRS', 4000),
    comparable('offer-1', 'Portal', 7000),
    comparable('offer-2', 'Portal', 12000),
  ])

  assert.equal(assessment.grade, 'Baja')
  assert.equal(assessment.traceabilityPct, 0)
  assert.ok((assessment.spreadPct ?? 0) > 45)
  assert.ok(assessment.risks.some((risk) => risk.includes('dispersión')))
  assert.ok(assessment.risks.some((risk) => risk.includes('fecha y distancia')))
})

test('unselected evidence never inflates confidence', () => {
  const ignored = comparable('ignored', 'CBRS', 6000, { dated: true, distanced: true })
  ignored.selected = false
  const assessment = assessValuationEvidence([ignored])

  assert.equal(assessment.comparableCount, 0)
  assert.equal(assessment.score, 0)
  assert.equal(assessment.grade, 'Baja')
  assert.ok(assessment.risks.some((risk) => risk.includes('tres comparables')))
})
