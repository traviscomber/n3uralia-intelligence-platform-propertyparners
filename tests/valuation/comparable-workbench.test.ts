import test from 'node:test'
import assert from 'node:assert/strict'
import type { ValuationComparable } from '../../lib/valuation-contract'
import { buildComparableWorkbench } from '../../lib/valuation-comparable-workbench'

function comparable(id: string, priceUf: number, patch: Partial<ValuationComparable> = {}): ValuationComparable {
  return {
    id,
    sourceType: 'Portal',
    sourceReference: `https://example.com/${id}`,
    address: `Comparable ${id}`,
    neighborhood: 'Vitacura',
    propertyType: 'Departamento',
    distanceMeters: 500,
    usefulAreaM2: 100,
    totalAreaM2: 100,
    priceUf,
    priceUfM2: priceUf / 100,
    similarityScore: 0.8,
    selected: false,
    adjustmentPct: 0,
    ...patch,
  }
}

test('workbench prioritizes close, complete and homogeneous evidence', () => {
  const signals = buildComparableWorkbench([
    comparable('a', 6000),
    comparable('b', 6200),
    comparable('c', 6400),
  ])

  assert.equal(signals[1].tier, 'Prioritario')
  assert.equal(signals[1].isOutlier, false)
  assert.ok(signals[1].score >= 75)
  assert.ok(signals[1].strengths.includes('Dentro del rango central'))
})

test('workbench marks a large UF/m² deviation as an outlier without auto-excluding it', () => {
  const signals = buildComparableWorkbench([
    comparable('a', 6000),
    comparable('b', 6200),
    comparable('outlier', 12000),
  ])
  const outlier = signals.find((item) => item.id === 'outlier')

  assert.equal(outlier?.isOutlier, true)
  assert.ok((outlier?.deviationPct ?? 0) > 35)
  assert.ok(outlier?.risks.some((risk) => risk.includes('mediana')))
})

test('workbench exposes missing traceability and insufficient area', () => {
  const signal = buildComparableWorkbench([
    comparable('weak', 6000, {
      sourceReference: '',
      address: '',
      distanceMeters: undefined,
      usefulAreaM2: undefined,
      totalAreaM2: undefined,
      similarityScore: 0.2,
    }),
  ])[0]

  assert.equal(signal.tier, 'Revisar')
  assert.equal(signal.canonicalUfM2, 0)
  assert.ok(signal.risks.includes('Sin referencia trazable'))
  assert.ok(signal.risks.includes('Falta superficie o precio suficiente'))
})

test('workbench never changes human selection', () => {
  const source = comparable('candidate', 6000, { selected: false })
  buildComparableWorkbench([source])
  assert.equal(source.selected, false)
})
