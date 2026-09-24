import assert from 'node:assert/strict'
import { test } from 'node:test'
import periodsData from '../data/management-canonical-periods.json'
import { getCanonicalManagementDashboardEntities, getCanonicalManagementPeriod } from '../lib/management-canonical-periods'

test('Jan-Aug current management canon is complete and chronologically contiguous', () => {
  assert.deepEqual(periodsData.periods.map((item) => item.period), [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08',
  ])
  assert.equal(periodsData.canonicalPolicy.currentAuthority, 'Ago_Directorio.pptx')
})

test('company monthly credits reconcile exactly to August board cumulative totals', () => {
  let cumulativeClosings = 0
  let cumulativeUf = 0
  for (const period of periodsData.periods) {
    cumulativeClosings += period.company.creditedClosings
    cumulativeUf += period.company.creditedSalesUf
    assert.equal(period.company.ytdCreditedClosings, cumulativeClosings, period.period)
    assert.equal(period.company.ytdCreditedSalesUf, cumulativeUf, period.period)
  }
  assert.equal(cumulativeClosings, 50.5)
  assert.equal(cumulativeUf, 920786)
})

test('office management credits reconcile but never replace the corporate authority', () => {
  for (const period of periodsData.periods) {
    const officeClosings = period.offices.reduce((sum, office) => sum + office.creditedClosings, 0)
    const officeUf = period.offices.reduce((sum, office) => sum + office.creditedSalesUf, 0)
    assert.equal(officeClosings, period.company.creditedClosings, `${period.period} closings`)
    assert.equal(officeUf, period.company.creditedSalesUf, `${period.period} UF`)
  }
})

test('June and July historical reports are preserved as evidence while later Pedro canon wins', () => {
  const june = getCanonicalManagementPeriod('2026-06')
  const july = getCanonicalManagementPeriod('2026-07')
  assert.ok(june)
  assert.ok(july)

  assert.equal(june.company.creditedClosings, 7)
  assert.equal(june.company.operationalClosings, 8)
  assert.equal(june.company.managementScore, 63.3)
  assert.equal((june.historicalIssuedSnapshot as { reportedClosings?: number }).reportedClosings, 8)
  assert.equal((june.historicalIssuedSnapshot as { reportedManagementScore?: number }).reportedManagementScore, 95)

  assert.equal(july.company.creditedClosings, 9.5)
  assert.equal(july.company.canonicalClosingTarget, 8.6)
  assert.equal(july.company.ytdCreditedClosings, 42.5)
  assert.equal(july.company.managementScore, 68.5)
  assert.equal(july.company.followUpScore, 68.5)
  assert.equal((july.historicalIssuedSnapshot as { closingReference?: number }).closingReference, 8.1)
  assert.equal((july.historicalIssuedSnapshot as { reportedYtdClosings?: number }).reportedYtdClosings, 43.5)
  assert.equal((july.historicalIssuedSnapshot as { reportedFollowUpScore?: number }).reportedFollowUpScore, 65.9)
})

test('dashboard period bounds are valid calendar dates, including February', () => {
  const feb = getCanonicalManagementPeriod('2026-02')
  assert.ok(feb)
  const entities = getCanonicalManagementDashboardEntities(feb)
  const company = entities.find((entity) => entity.entityType === 'company')
  assert.ok(company)
  const closures = company.metrics.find((metric) => metric.code === 'management_credited_sales')
  assert.equal(closures?.periodStart, '2026-02-01')
  assert.equal(closures?.periodEnd, '2026-02-28')
})

test('Partner values are not inferred from office data', () => {
  assert.equal(periodsData.periods.every((period) => period.partnerLevelAvailable === false), true)
  const latest = getCanonicalManagementDashboardEntities()
  assert.equal(latest.some((entity) => entity.entityType === 'partner'), false)
})


test('published monthly and cumulative closing targets are preserved as independent facts', () => {
  const expectedMonthly = [5.86, 4.63, 7.8, 7.33, 8.6, 8.8, 8.6, 8.2]
  const expectedCumulative = [5.86, 10.49, 18.29, 25.61, 34.2, 43, 50.4, 58.6]
  assert.deepEqual(periodsData.periods.map((period) => period.company.canonicalClosingTarget), expectedMonthly)
  assert.deepEqual(periodsData.periods.map((period) => period.company.ytdCanonicalClosingTarget), expectedCumulative)

  const july = periodsData.periods.find((period) => period.period === '2026-07')
  assert.ok(july)
  assert.equal(july.company.canonicalClosingTarget, 8.6)
  assert.equal(july.company.ytdCanonicalClosingTarget, 50.4)
  assert.equal(Number((july.company.ytdCanonicalClosingTarget - 43).toFixed(1)), 7.4)
  assert.notEqual(july.company.canonicalClosingTarget, 7.4)
})

test('office monthly targets are fractional allocations and approximately reconcile to company target', () => {
  for (const period of periodsData.periods) {
    const officeTarget = period.offices.reduce((sum, office) => sum + (office.canonicalClosingTarget ?? 0), 0)
    assert.ok(Math.abs(officeTarget - period.company.canonicalClosingTarget) <= 0.02, `${period.period}: ${officeTarget}`)
  }
})
