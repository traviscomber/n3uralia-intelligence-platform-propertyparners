import assert from 'node:assert/strict'
import { buildManagementReportComparisons, creditedSalesUf } from '../lib/management-report-comparisons'
import type { ManagementReportRecord } from '../lib/management-report-artifact'

type Report = ManagementReportRecord & { entity_id: string }

const entityId = 'pp-vitacura-fixture'
const report = (periodStart: string, periodEnd: string, company: Record<string, unknown>, scope: Record<string, unknown> = {}): Report => ({
  id: periodStart,
  entity_id: entityId,
  report_type: 'monthly',
  period_start: periodStart,
  period_end: periodEnd,
  snapshot: { company, scope },
})

const june = report('2026-06-01', '2026-06-30', {
  cartera: 351,
  captaciones: 36,
  leadsNuevos: 392,
  requerimientos: 617,
  volumenUfBruto: 158400,
  visitasAgendadas: 319,
  visitasRealizadas: 184,
  cierresAcreditados: 8,
  cumplimientoVisitas: 57.68025078369906,
  suspendidas: 64,
})

const july = report('2026-07-01', '2026-07-31', {
  cartera: 350,
  captaciones: 29,
  leadsNuevos: 435,
  requerimientos: 629,
  volumenUfBruto: 186357,
  volumenUfAcreditado: 158266,
  visitasAgendadas: 307,
  visitasRealizadas: 160,
  cierresAcreditados: 9.5,
  cierresOperacionales: 11,
  cumplimientoVisitas: 52.11726384364821,
  suspendidas: 56,
}, {
  grossSalesUf: 186357,
  managementCreditedSalesUf: 158266,
  managementCreditedClosures: 9.5,
  rawOperations: 11,
})

const janToMay = [
  report('2026-01-01', '2026-01-31', { cierresAcreditados: 4, volumenUfBruto: 103150 }),
  report('2026-02-01', '2026-02-28', { cierresAcreditados: 3, volumenUfBruto: 48800 }),
  report('2026-03-01', '2026-03-31', { cierresAcreditados: 7, volumenUfBruto: 155970 }),
  report('2026-04-01', '2026-04-30', { cierresAcreditados: 8, volumenUfBruto: 107500 }),
  report('2026-05-01', '2026-05-31', { cierresAcreditados: 4, volumenUfBruto: 69850 }),
]

const goals = [1, 2, 3, 4, 5, 6, 7].flatMap((month) => {
  const mm = String(month).padStart(2, '0')
  const lastDay = [1, 3, 5, 7].includes(month) ? 31 : month === 2 ? 28 : 30
  return [
    {
      metric_code: 'sales', period_start: `2026-${mm}-01`, period_end: `2026-${mm}-${lastDay}`,
      target_value: 8.1, source_name: 'reporte comercial', status: 'assigned', approved_at: null, formula_version: 1,
    },
    {
      metric_code: 'leads', period_start: `2026-${mm}-01`, period_end: `2026-${mm}-${lastDay}`,
      target_value: month <= 2 ? 400 : 500, source_name: 'reporte comercial', status: 'assigned', approved_at: null, formula_version: 1,
    },
  ]
})

const comparisons = buildManagementReportComparisons({
  current: july,
  previous: june,
  ytdReports: [...janToMay, june, july],
  goals,
})

assert.equal(creditedSalesUf(july), 158266, 'July credited UF must never fall back to gross 186357 when an accredited value exists.')
assert.equal(comparisons.mom.status, 'exact')
assert.equal(comparisons.mom.previousPeriod, '2026-06')
assert.ok(comparisons.mom.metrics)
assert.ok(Math.abs((comparisons.mom.metrics?.closures.delta?.value ?? 0) - 18.75) < 1e-9)
assert.ok(Math.abs((comparisons.mom.metrics?.leads.delta?.value ?? 0) - 10.969387755102034) < 1e-9)
assert.ok(Math.abs((comparisons.mom.metrics?.creditedUf.delta?.value ?? 0) - (-0.08459595959595623)) < 1e-9)
assert.ok(Math.abs((comparisons.mom.metrics?.visitCompliance.delta?.value ?? 0) - (-5.56298694005085)) < 1e-9)

assert.equal(comparisons.targets.current.sales.actual, 9.5)
assert.equal(comparisons.targets.current.sales.target, 8.1)
assert.ok(Math.abs((comparisons.targets.current.sales.attainmentPct ?? 0) - 117.28395061728395) < 1e-9)
assert.equal(comparisons.targets.current.sales.officialForScoring, false)
assert.equal(comparisons.targets.current.leads.actual, 435)
assert.equal(comparisons.targets.current.leads.target, 500)
assert.equal(comparisons.targets.current.leads.attainmentPct, 87)
assert.equal(comparisons.targets.ytd.closures, 43.5)
assert.ok(Math.abs((comparisons.targets.ytd.target ?? 0) - 56.7) < 1e-9)
assert.ok(Math.abs((comparisons.targets.ytd.attainmentPct ?? 0) - 76.71957671957672) < 1e-9)
assert.equal(comparisons.targets.ytd.officialForScoring, false)
assert.equal(comparisons.yoy.status, 'same_period_not_canonicalized', 'Do not invent July 2025 from annual aggregates.')

console.log('Management report comparisons verified: exact MoM, documentary targets, credited dimensions and fail-closed YoY.')
