import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import targets from '@/data/targets-2026.json'
import {
  CANONICAL_COMPANY_MONTHLY_SALES_TARGET,
  LEGACY_DOCUMENTARY_COMPANY_MONTHLY_SALES_TARGET,
  getCompanySalesCompliance,
} from '@/lib/targets-2026'

assert.equal(CANONICAL_COMPANY_MONTHLY_SALES_TARGET, 8)
assert.equal(LEGACY_DOCUMENTARY_COMPANY_MONTHLY_SALES_TARGET, 8.1)
assert.equal(targets.companyMonthlyTargets.sales_count['2026-06'], 8.1, 'La referencia histórica 8.1 debe preservarse sin reescribir el archivo fuente')

const june = getCompanySalesCompliance('2026-06')
assert.equal(june.actual, 8)
assert.equal(june.target, 8)
assert.equal(june.compliance, 100)
assert.equal(june.legacyDocumentaryTarget, 8.1)

const july = getCompanySalesCompliance('2026-07')
assert.equal(july.target, 8)
assert.equal(july.legacyDocumentaryTarget, targets.companyMonthlyTargets.sales_count['2026-07'])
if (july.actual !== null) {
  assert.equal(july.compliance, Number(((july.actual / 8) * 100).toFixed(1)))
}

const source = readFileSync('lib/targets-2026.ts', 'utf8')
assert.ok(!source.includes('management_credited_sales'), 'La meta corporativa no debe acoplarse al crédito fraccionario de gestión')

console.log(JSON.stringify({
  ok: true,
  canonicalMonthlySalesTarget: CANONICAL_COMPANY_MONTHLY_SALES_TARGET,
  preservedLegacyDocumentaryTarget: LEGACY_DOCUMENTARY_COMPANY_MONTHLY_SALES_TARGET,
  june: { actual: june.actual, target: june.target, compliance: june.compliance },
  july: { actual: july.actual, target: july.target, compliance: july.compliance },
}, null, 2))
