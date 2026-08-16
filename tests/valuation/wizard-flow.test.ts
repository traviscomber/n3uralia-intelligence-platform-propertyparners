import test from 'node:test'
import assert from 'node:assert/strict'
import type { ValuationSubject } from '../../lib/valuation-contract'
import { valuationWizardBlockingReason } from '../../lib/valuation-wizard'

const department: ValuationSubject = {
  propertyType: 'Departamento',
  address: 'LAS NIEVES 3850 DP 101',
  neighborhood: 'Alonso de Córdova',
  rol: '435-29',
  usefulAreaM2: 88,
  bedrooms: 3,
  bathrooms: 3,
}

test('wizard lets an identified canonical property advance', () => {
  assert.equal(valuationWizardBlockingReason({ step: 1, subject: department, selectedComparableCount: 0, hasResult: false }), null)
  assert.equal(valuationWizardBlockingReason({ step: 2, subject: department, selectedComparableCount: 0, hasResult: false }), null)
})

test('wizard keeps unknown apartment area explicit instead of treating it as zero', () => {
  const subject = { ...department, usefulAreaM2: undefined }
  assert.match(
    valuationWizardBlockingReason({ step: 2, subject, selectedComparableCount: 0, hasResult: false }) ?? '',
    /m² útiles/,
  )
})

test('wizard requires three human-selected comparables before the decision step', () => {
  assert.match(
    valuationWizardBlockingReason({ step: 3, subject: department, selectedComparableCount: 2, hasResult: false }) ?? '',
    /tres comparables/,
  )
  assert.equal(valuationWizardBlockingReason({ step: 3, subject: department, selectedComparableCount: 3, hasResult: false }), null)
})

test('wizard requires a deterministic valuation result before final review', () => {
  assert.match(
    valuationWizardBlockingReason({ step: 4, subject: department, selectedComparableCount: 3, hasResult: false }) ?? '',
    /tasa de valorización/,
  )
  assert.equal(valuationWizardBlockingReason({ step: 4, subject: department, selectedComparableCount: 3, hasResult: true }), null)
})
