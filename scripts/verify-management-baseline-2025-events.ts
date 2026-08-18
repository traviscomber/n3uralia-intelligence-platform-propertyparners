import assert from 'node:assert/strict'
import baseline from '../data/management-baseline-2025-events.json'
import contracts from '../data/management-source-contracts-2025.json'

assert.equal(baseline.status, 'verified_from_authoritative_xlsx')
assert.equal(baseline.months.length, 12)

const sourceByDataset = new Map(contracts.sources.map((source) => [source.dataset, source]))
for (const [dataset, source] of Object.entries(baseline.sources)) {
  const contract = sourceByDataset.get(dataset)
  assert.ok(contract, `${dataset}: missing canonical source contract`)
  assert.equal(source.sha256, contract.sha256, `${dataset}: SHA drift`)
  assert.equal(source.canonicalRows, contract.expectedCanonicalRows, `${dataset}: canonical row drift`)
}

const sums = baseline.months.reduce((acc, month) => ({
  leads: acc.leads + month.leadsCreated,
  requirements: acc.requirements + month.requirementsCreated,
  visits: acc.visits + month.visitsScheduledUnique,
  realized: acc.realized + month.visitsRealizedUnique,
}), { leads: 0, requirements: 0, visits: 0, realized: 0 })

assert.equal(sums.leads, baseline.totals.leadsCreated)
assert.equal(sums.requirements, baseline.totals.requirementsCreated)
assert.equal(sums.visits, baseline.totals.visitsScheduledUnique)
assert.equal(sums.realized, baseline.totals.visitsRealizedUnique)
assert.equal(sums.leads, 4023)
assert.equal(sums.requirements, 4594)
assert.equal(sums.visits, 3619)
assert.equal(sums.realized, 2252)

for (let index = 0; index < baseline.months.length; index += 1) {
  const month = baseline.months[index]
  assert.equal(month.period, `2025-${String(index + 1).padStart(2, '0')}`)
  assert.ok(month.visitsRealizedUnique <= month.visitsScheduledUnique)
  const expectedRate = Math.round((month.visitsRealizedUnique / month.visitsScheduledUnique) * 10000) / 100
  assert.equal(month.visitRealizationRatePct, expectedRate)
}

const july = baseline.months.find((month) => month.period === '2025-07')
assert.ok(july)
assert.deepEqual(july, {
  period: '2025-07',
  leadsCreated: 423,
  requirementsCreated: 546,
  visitsScheduledUnique: 386,
  visitsRealizedUnique: 239,
  visitRealizationRatePct: 61.92,
})

console.log('2025 monthly management event baseline verified: authoritative SHA, annual sums, monthly continuity and July YoY baseline.')
