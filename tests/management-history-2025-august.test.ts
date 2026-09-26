import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { getCanonicalManagementDashboardEntities } from '../lib/management-canonical-periods'

test('2025 monthly baseline preserves six verified company metrics without fabricating monthly stock/captations/suspensions', () => {
  const sql = readFileSync('supabase/migrations/20260926220500_backfill_2025_monthly_management_events.sql','utf8')
  for (const code of ['leads','requirements','scheduled_visits','realized_visits']) {
    assert.match(sql,new RegExp("'" + code + "'"))
  }
  assert.match(sql,/historical_operational_baseline/)
  assert.match(sql,/verified_metric_codes>=6/)
  assert.doesNotMatch(sql,/2025-[0-9]{2}[^\n]*'stock'/)
  assert.doesNotMatch(sql,/2025-[0-9]{2}[^\n]*'listings'/)
  assert.doesNotMatch(sql,/2025-[0-9]{2}[^\n]*'suspended_listings'/)
})

test('2025 monthly event values reconcile to audited annual totals', () => {
  const baseline = JSON.parse(readFileSync('data/management-baseline-2025-events.json','utf8'))
  const sums = baseline.months.reduce((acc:any,month:any)=>({
    leads:acc.leads+month.leadsCreated,
    requirements:acc.requirements+month.requirementsCreated,
    scheduled:acc.scheduled+month.visitsScheduledUnique,
    realized:acc.realized+month.visitsRealizedUnique,
  }),{leads:0,requirements:0,scheduled:0,realized:0})

  assert.deepEqual(sums,{
    leads:4023,
    requirements:4594,
    scheduled:3619,
    realized:2252,
  })
})

test('August board backfill reconciles office credits exactly to company authority', () => {
  const sql = readFileSync('supabase/migrations/20260926220000_backfill_august_management_metrics.sql','utf8')
  assert.match(sql,/Property Partners Vitacura','management_credited_sales',8\.0/)
  assert.match(sql,/Santa María','management_credited_sales',3\.5/)
  assert.match(sql,/Nueva Costanera','management_credited_sales',2\.0/)
  assert.match(sql,/Lo Beltrán','management_credited_sales',2\.5/)
  assert.match(sql,/Property Partners Vitacura','management_credited_sales_uf',141650/)
  assert.match(sql,/verified_source_value_not_auto_approved/)
})


test('CEO company evolution exposes 2025 baseline while office evolution remains source-bounded to 2026', () => {
  const entities = getCanonicalManagementDashboardEntities()
  const company = entities.find((entity) => entity.entityType === 'company')
  const offices = entities.filter((entity) => entity.entityType === 'branch')
  assert.ok(company)

  const july2025 = company.evolution?.find((point) => point.period === '2025-07')
  assert.ok(july2025)
  assert.equal(july2025.sales, 5)
  assert.equal(july2025.metrics?.leads, 423)
  assert.equal(july2025.metrics?.requirements, 546)
  assert.equal(july2025.metrics?.scheduled_visits, 386)
  assert.equal(july2025.metrics?.realized_visits, 239)

  assert.equal(company.evolution?.filter((point) => point.period.startsWith('2025-')).length, 12)
  assert.equal(offices.every((office) => office.evolution?.every((point) => point.period.startsWith('2026-'))), true)
})


test('history coverage view preserves underlying management RLS', () => {
  const sql = readFileSync('supabase/migrations/20260926220600_secure_management_history_coverage.sql','utf8')
  assert.match(sql,/security_invoker\s*=\s*true/)
})
