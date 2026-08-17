import assert from 'node:assert/strict'
import { normalizeManagementReportOutput } from '../lib/management-report-output'
import type { ManagementReportRecord } from '../lib/management-report-artifact'

function report(snapshot: Record<string, unknown>): ManagementReportRecord {
  return {
    id: 'qa',
    report_type: 'monthly',
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    snapshot,
  }
}

const july = normalizeManagementReportOutput(report({
  company: {
    cierresAcreditados: 9.5,
    volumenUfBruto: 186357,
  },
  scope: {
    rawOperations: 11,
    managementCreditedClosures: 9.5,
    grossSalesUf: 186357,
    managementCreditedSalesUf: 158266,
  },
  completeness: {
    blocked: [{ code: 'goal_compliance', reason: 'No hay meta aprobada.' }],
  },
}))

const julyCompany = july.snapshot.company as Record<string, unknown>
assert.equal(julyCompany.cierresAcreditados, 9.5)
assert.equal(julyCompany.cierresOperacionales, 11)
assert.equal(julyCompany.volumenUfAcreditado, 158266)
assert.equal(julyCompany.volumenUfOperacionalBruto, 186357)
assert.equal(julyCompany.volumenUfBruto, 158266, 'compatibility headline must use credited UF')

const blocked = (july.snapshot.completeness as { blocked?: Array<{ code?: string }> }).blocked ?? []
assert.equal(blocked[0]?.code, 'Cumplimiento de meta')

const january = normalizeManagementReportOutput(report({
  company: {
    cierresAcreditados: 4,
    volumenUfBruto: 103150,
  },
}))
const januaryCompany = january.snapshot.company as Record<string, unknown>
assert.equal(januaryCompany.volumenUfBruto, 103150)
assert.equal(januaryCompany.volumenUfAcreditado, 103150, 'pre-July months must preserve the canonical single UF dimension')
assert.equal(januaryCompany.volumenUfOperacionalBruto, 103150)

const missing = normalizeManagementReportOutput(report({ company: { visitasAgendadas: null, visitasRealizadas: null } }))
const missingCompany = missing.snapshot.company as Record<string, unknown>
assert.equal(missingCompany.visitasAgendadas, null)
assert.equal(missingCompany.visitasRealizadas, null)

console.log('[management-report-semantics] PASS: raw/credited dimensions, legacy fallback and missing values are preserved')
