import assert from 'node:assert/strict'
import crm from '../data/crm-intelligence.json'
import contracts from '../data/management-source-contracts-2025.json'
import eventBaseline from '../data/management-baseline-2025-events.json'

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

assert.equal(eventBaseline.status, 'verified_from_authoritative_xlsx', '2025 event baseline must remain verified')
assert.equal(eventBaseline.months.length, 12, '2025 event baseline must contain all twelve months')
const eventSources = eventBaseline.sources as Record<string, { sha256:string; canonicalRows:number }>
for (const dataset of ['lead_created', 'requirement_created', 'visit_appointment']) {
  const contract = contracts.sources.find((source) => source.dataset === dataset)
  const source = eventSources[dataset]
  assert.ok(contract && source, `${dataset}: missing monthly event baseline provenance`)
  assert.equal(source.sha256, contract.sha256, `${dataset}: monthly event baseline SHA drift`)
  assert.equal(source.canonicalRows, contract.expectedCanonicalRows, `${dataset}: monthly event baseline row drift`)
}

const eventTotals = eventBaseline.months.reduce((acc, month) => ({
  leads: acc.leads + month.leadsCreated,
  requirements: acc.requirements + month.requirementsCreated,
  visits: acc.visits + month.visitsScheduledUnique,
  realized: acc.realized + month.visitsRealizedUnique,
}), { leads: 0, requirements: 0, visits: 0, realized: 0 })
assert.equal(eventTotals.leads, baseline.newLeadsCount, 'Monthly leads must reconcile to annual baseline')
assert.equal(eventTotals.requirements, baseline.requirementsCount, 'Monthly requirements must reconcile to annual baseline')
assert.equal(eventTotals.visits, baseline.uniqueVisitAppointmentsCount, 'Monthly visits must reconcile to annual baseline')
assert.equal(eventTotals.realized, eventBaseline.totals.visitsRealizedUnique, 'Monthly realized visits must reconcile to event baseline')
assert.equal(eventTotals.realized, 2252, '2025 realized visits baseline drift')

for (let index = 0; index < eventBaseline.months.length; index += 1) {
  const month = eventBaseline.months[index]
  assert.equal(month.period, `2025-${String(index + 1).padStart(2, '0')}`, 'Monthly event periods must be continuous')
  assert.ok(month.visitsRealizedUnique <= month.visitsScheduledUnique, `${month.period}: realized visits cannot exceed scheduled visits`)
}

const july = eventBaseline.months.find((month) => month.period === '2025-07')
assert.ok(july, 'July 2025 event baseline is required for current YoY')
assert.equal(july.leadsCreated, 423)
assert.equal(july.requirementsCreated, 546)
assert.equal(july.visitsScheduledUnique, 386)
assert.equal(july.visitsRealizedUnique, 239)
assert.equal(july.visitRealizationRatePct, 61.92)

console.log('2025 management source contracts verified: authoritative SHA, canonical totals, monthly event reconciliation and source boundaries.')
