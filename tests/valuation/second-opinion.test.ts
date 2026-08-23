import assert from 'node:assert/strict'
import test from 'node:test'
import type { ValuationComparable, ValuationSubject } from '../../lib/valuation-contract'
import { buildValuationSecondOpinion } from '../../lib/valuation-second-opinion'

const subject: ValuationSubject = {
  propertyType: 'Casa',
  address: 'ARTIGAS 643',
  neighborhood: 'Santa María',
  builtAreaM2: 520,
  landAreaM2: 1194,
}

function comparable(id: string, address: string, priceUf: number, builtAreaM2: number, landAreaM2: number): ValuationComparable {
  return {
    id,
    sourceType: 'CBRS',
    sourceReference: `CBRS ${id}`,
    address,
    neighborhood: 'Santa María',
    propertyType: 'Casa',
    builtAreaM2,
    landAreaM2,
    priceUf,
    priceUfM2: 0,
    similarityScore: 0.93,
    selected: true,
    adjustmentPct: 0,
    adjustmentNotes: 'Venta comparable revisada.',
  }
}

test('second opinion is advisory and identifies dispersion without changing evidence', () => {
  const comparables = [
    comparable('1', 'LO RECABARREN 6518', 45262, 520, 1084),
    comparable('2', 'CADAQUES 376', 36500, 494, 1336),
    comparable('3', 'PAYSANDU 5952', 40000, 546, 1404),
  ]

  const before = structuredClone(comparables)
  const opinion = buildValuationSecondOpinion({ subject, comparables, hasCurrentStateNotes: false })

  assert.equal(opinion.version, 'property-partners-second-opinion-v1')
  assert.equal(opinion.coverage, 'Media')
  assert.equal(opinion.disclaimer, 'No vinculante. No modifica la valorización.')
  assert.ok(opinion.findings.some((finding) => finding.title === 'Dispersión alta'))
  assert.ok(opinion.findings.some((finding) => finding.title === 'Valores atípicos'))
  assert.ok(opinion.findings.some((finding) => finding.title === 'Solo ventas'))
  assert.deepEqual(comparables, before)
})

test('second opinion reports low coverage when the minimum sample is not met', () => {
  const opinion = buildValuationSecondOpinion({
    subject,
    comparables: [comparable('1', 'CADAQUES 376', 36500, 494, 1336)],
    hasCurrentStateNotes: true,
  })

  assert.equal(opinion.coverage, 'Baja')
  assert.equal(opinion.findings[0]?.title, 'Evidencia todavía insuficiente')
})
