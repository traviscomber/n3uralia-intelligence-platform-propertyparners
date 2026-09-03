import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildCeoCurrentOperationalSnapshot } from '../lib/management-ceo-current'

const metrics = [
  {
    metric_code: 'sales', period_start: '2026-06-01', period_end: '2026-06-30', value: 7,
    source_name: 'documentary fallback', source_reference: 'legacy', source_cutoff_at: null,
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-07-01T00:00:00Z',
  },
  {
    metric_code: 'sales', period_start: '2026-07-01', period_end: '2026-07-31', value: 11,
    source_name: 'CRM canonical exports July 2026', source_reference: 'Cierres_julio_2026.xlsx', source_cutoff_at: '2026-08-02T00:00:00Z',
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-08-06T01:26:07Z',
  },
  {
    metric_code: 'sales', period_start: '2026-08-01', period_end: '2026-08-31', value: 99,
    source_name: 'unverified future fixture', source_reference: null, source_cutoff_at: null,
    quality_status: 'provisional', evaluation_status: 'evaluable', updated_at: '2026-09-01T00:00:00Z',
  },
  {
    metric_code: 'sales_uf', period_start: '2026-07-01', period_end: '2026-07-31', value: 186357,
    source_name: 'CRM canonical exports July 2026', source_reference: 'Cierres_julio_2026.xlsx', source_cutoff_at: '2026-08-02T00:00:00Z',
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-08-05T22:39:23Z',
  },
  {
    metric_code: 'management_credited_sales', period_start: '2026-07-01', period_end: '2026-07-31', value: 9.5,
    source_name: 'CRM canonical exports July 2026', source_reference: 'Cierres_julio_2026.xlsx', source_cutoff_at: '2026-08-02T00:00:00Z',
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-08-06T01:26:07Z',
  },
  {
    metric_code: 'active_leads_snapshot', period_start: '2026-07-01', period_end: '2026-07-31', value: 1680,
    source_name: 'CRM canonical exports July 2026', source_reference: 'leads.xlsx', source_cutoff_at: '2026-08-02T00:00:00Z',
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-08-05T22:39:23Z',
  },
  {
    metric_code: 'stale_90_leads', period_start: '2026-07-01', period_end: '2026-07-31', value: 451,
    source_name: 'CRM canonical exports July 2026', source_reference: 'stale.xlsx', source_cutoff_at: '2026-08-02T00:00:00Z',
    quality_status: 'verified', evaluation_status: 'evaluable', updated_at: '2026-08-05T22:39:23Z',
  },
] as const

const goals = [
  {
    metric_code: 'sales', period_start: '2026-07-01', period_end: '2026-07-31', target_value: 8.1,
    status: 'assigned', approved_at: null, source_name: 'legacy documentary target',
  },
  {
    metric_code: 'sales', period_start: '2026-07-01', period_end: '2026-07-31', target_value: 8,
    status: 'approved', approved_at: '2026-09-03T19:41:33Z', source_name: 'canonical monthly sales target',
  },
] as const

const snapshot = buildCeoCurrentOperationalSnapshot({ metrics: [...metrics], goals: [...goals] })
assert.ok(snapshot, 'A verified operational snapshot must be produced')
assert.equal(snapshot.period.key, '2026-07', 'The latest verified/evaluable sales period must anchor the CEO view')
assert.equal(snapshot.sales, 11, 'Corporate sales must use raw verified operations')
assert.equal(snapshot.salesTarget, 8, 'Only the approved canonical target may drive CEO compliance')
assert.equal(snapshot.compliance, 137.5, '11 / 8 must equal 137.5%')
assert.equal(snapshot.managementCreditedSales, 9.5, 'Fractional management credit must remain a separate dimension')
assert.notEqual(snapshot.sales, snapshot.managementCreditedSales, 'Management credit must never replace corporate sales')
assert.equal(snapshot.status, 'verified_operational')
assert.equal(snapshot.publicationStatus, 'not_formal_monthly_close')

const withoutApprovedGoal = buildCeoCurrentOperationalSnapshot({ metrics: [...metrics], goals: [goals[0]] })
assert.ok(withoutApprovedGoal)
assert.equal(withoutApprovedGoal.salesTarget, null, 'An unapproved legacy target must not become canonical')
assert.equal(withoutApprovedGoal.compliance, null, 'Compliance must fail closed without an approved target')

const ceoToday = readFileSync('components/management/ceo-today.tsx', 'utf8')
assert.match(ceoToday, /\/api\/management\/ceo-current/, 'CEO Today must use the verified operational endpoint')
assert.doesNotMatch(ceoToday, /\/api\/management\/summary/, 'CEO Today must not derive current status from the documentary summary fallback')

const dashboardHome = readFileSync('app/dashboard/page.tsx', 'utf8')
assert.match(dashboardHome, /redirect\('\/dashboard\/ceo'\)/, 'CEO/admin dashboard root must enter the operational CEO surface')
assert.match(dashboardHome, /redirect\('\/dashboard\/director'\)/, 'Directors must enter their role-specific operational surface')

const marketPage = readFileSync('app/dashboard/market/page.tsx', 'utf8')
assert.match(marketPage, /formatPropertyPartnersDateTime/, 'Market cutoffs must use the shared Santiago business-time formatter')

const managementOperations = readFileSync('app/dashboard/control/operations/page.tsx', 'utf8')
assert.match(managementOperations, /latestWithEvidence/, 'Management operations must bootstrap from the latest period that contains evidence')
assert.match(managementOperations, /formatPropertyPartnersDate/, 'Management report dates must use Santiago business time')

console.log('Operational CEO coherence: PASS')
