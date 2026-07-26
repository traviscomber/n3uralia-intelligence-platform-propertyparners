import assert from 'node:assert/strict'
import test from 'node:test'

import crm from '../data/crm-intelligence.json'

test('CRM intelligence preserves its operational scope and privacy boundary', () => {
  assert.equal(crm.scope.commune, 'Vitacura')
  assert.equal(crm.scope.operation, 'Venta')
  assert.deepEqual(crm.scope.propertyTypes, ['Casa', 'Departamento'])
  assert.equal(crm.scope.piiIncluded, false)
})

test('CRM source inventory remains complete and cryptographically traceable', () => {
  assert.equal(crm.sourceInventory.workbookCount, 84)
  assert.equal(crm.sourceInventory.workbooks.length, 84)
  assert.equal(crm.sourceInventory.cellCoverage.sheetCount, 92)
  assert.equal(crm.sourceInventory.datasetCoverage.length, 13)

  assert.ok(
    crm.sourceInventory.workbooks.every(
      (workbook) =>
        /^[a-f0-9]{64}$/.test(workbook.fileSha256) &&
        workbook.sheets.every((sheet) => /^[a-f0-9]{64}$/.test(sheet.cellDigest)),
    ),
  )
})

test('CRM monthly intelligence covers January through June 2026 without inventing missing data', () => {
  assert.deepEqual(
    crm.months.map((month) => month.period),
    ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
  )
  assert.equal(crm.months.find((month) => month.period === '2026-02')?.visitsCount, null)
  assert.equal(crm.ytd.visitsCount, null)
  assert.equal(crm.leadSnapshots.find((snapshot) => snapshot.period === '2026-02')?.active, null)
})

test('CRM YTD commercial metrics retain their authoritative reconciliations', () => {
  assert.equal(crm.ytd.salesCount, 34)
  assert.equal(crm.ytd.salesUf, 643670)
  assert.equal(crm.ytd.capturesCount, 193)
  assert.equal(crm.ytd.newLeadsCount, 1988)
  assert.equal(crm.ytd.requirementsCount, 3470)
  assert.equal(crm.ytd.knownVisitsCount, 1591)
  assert.equal(crm.ytd.knownRealizedVisitsCount, 979)
  assert.equal(crm.ytd.knownRealizedVisitsRate, 61.5)
})

test('CRM identity metrics prevent duplicate counting across periods', () => {
  assert.equal(crm.ytd.crossPeriodDuplicateIds.sales, 0)
  assert.equal(crm.ytd.crossPeriodDuplicateIds.captures, 0)
  assert.equal(crm.ytd.crossPeriodDuplicateIds.leads, 0)
  assert.equal(crm.ytd.crossPeriodDuplicateIds.requirements, 0)
  assert.equal(crm.ytd.crossPeriodDuplicateIds.visits, 8)
})

test('CRM seller and office attribution expose incomplete coverage explicitly', () => {
  assert.equal(crm.ytd.sellerAttribution.identified, 33)
  assert.equal(crm.ytd.sellerAttribution.missing, 1)
  assert.equal(crm.ytd.sellerAttribution.coverage, 97.1)
  assert.equal(
    crm.ytd.salesByOffice.reduce((sum, office) => sum + office.count, 0),
    30,
  )
})

test('CRM lead intelligence retains the complete stale follow-up queue', () => {
  assert.equal(crm.latestLeadSnapshot.stale15To90, 596)
  assert.equal(crm.latestLeadSnapshot.staleOver90, 505)
  assert.equal(crm.latestLeadSnapshot.staleOver15Total, 1101)
  assert.equal(crm.latestLeadSnapshot.staleOver15Rate, 62.2)
})

test('CRM auxiliary sources and targets remain auditable rather than silently corrected', () => {
  assert.ok(
    Object.values(crm.sourceReconciliations).every(
      (reconciliation) => reconciliation.exactMatch,
    ),
  )
  assert.equal(crm.targetsContract.status, 'loaded_with_critical_issues')
  assert.equal(crm.targetsContract.workbookCount, 3)
  assert.equal(crm.targetsContract.sourceIssueCount, 27)
  assert.equal(crm.targetsContract.criticalSourceIssueCount, 4)
})
