import assert from 'node:assert/strict'
import crm from '../data/crm-intelligence.json'
import contracts from '../data/management-source-contracts-2025.json'

type Workbook = { file:string; dataset:string; sourceRole:string; fileSha256:string; dataRows:number }
const workbooks = (crm.sourceInventory.workbooks ?? []) as Workbook[]
const byFile = new Map(workbooks.map((workbook) => [workbook.file, workbook]))

for (const source of contracts.sources) {
  const workbook = byFile.get(source.file)
  assert.ok(workbook, `Missing audited workbook contract for ${source.file}`)
  assert.equal(workbook?.fileSha256, source.sha256, `${source.dataset}: SHA contract drift`)
  assert.equal(workbook?.dataset, source.dataset, `${source.dataset}: dataset contract drift`)
  assert.equal(workbook?.sourceRole, 'authoritative', `${source.dataset}: granular publication requires authoritative source`)
}

const baseline = crm.baseline2025
assert.equal(baseline.salesCount, 61, '2025 sales baseline drift')
assert.equal(baseline.salesUf, 919970, '2025 sales UF baseline drift')
assert.equal(baseline.newLeadsCount, 4023, '2025 lead baseline drift')
assert.equal(baseline.requirementsCount, 4594, '2025 requirements baseline drift')
assert.equal(baseline.uniqueVisitAppointmentsCount, 3619, '2025 visit baseline drift')

const expected = new Map(contracts.sources.map((source) => [source.dataset, source.expectedCanonicalRows]))
assert.equal(expected.get('sale_closed'), baseline.salesCount)
assert.equal(expected.get('lead_created'), baseline.newLeadsCount)
assert.equal(expected.get('requirement_created'), baseline.requirementsCount)
assert.equal(expected.get('visit_appointment'), baseline.uniqueVisitAppointmentsCount)

const annualContextDatasets = new Set(workbooks.filter((workbook) => workbook.sourceRole === 'annual_context' && workbook.file.startsWith('Datos 2025/')).map((workbook) => workbook.dataset))
for (const source of contracts.sources) assert.ok(!annualContextDatasets.has(source.dataset), `${source.dataset}: annual_context cannot be a granular authoritative contract`)

assert.equal(crm.sourceReconciliations.sales2025WithoutSellerVsWithSeller.exactMatch, true, '2025 sales ID reconciliation must remain exact')
assert.equal(crm.sourceReconciliations.sales2025SummaryVsAuthoritative.exactMatch, true, '2025 sales summary reconciliation must remain exact')

console.log('2025 management source contracts verified: authoritative SHA, canonical totals and reconciliation boundaries.')
