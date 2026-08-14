import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  advanceSchedule,
  assertClosedMonthlyPeriod,
  canRunManagementReports,
  getCronAuthorizationFailure,
  isClosedMonthlyPeriod,
  previousMonthBounds,
} from '../lib/management-report-schedule'

assert.equal(getCronAuthorizationFailure(null, undefined), 'missing_secret')
assert.equal(getCronAuthorizationFailure(null, 'secret'), 'missing_authorization')
assert.equal(getCronAuthorizationFailure('Bearer wrong', 'secret'), 'invalid_authorization')
assert.equal(getCronAuthorizationFailure('Bearer secret', 'secret'), null)

assert.equal(canRunManagementReports('admin'), true)
assert.equal(canRunManagementReports('CEO'), true)
assert.equal(canRunManagementReports('director'), false)
assert.equal(canRunManagementReports('subdirector'), false)
assert.equal(canRunManagementReports('seller'), false)
assert.equal(canRunManagementReports(null), false)

assert.deepEqual(previousMonthBounds(new Date('2026-01-15T12:00:00.000Z')), {
  start: '2025-12-01',
  end: '2025-12-31',
})
assert.deepEqual(previousMonthBounds(new Date('2026-08-01T09:00:00.000Z')), {
  start: '2026-07-01',
  end: '2026-07-31',
})

const augustSecond = new Date('2026-08-02T23:31:00.000Z')
assert.equal(isClosedMonthlyPeriod('2026-07', augustSecond), true)
assert.equal(isClosedMonthlyPeriod('2026-08', augustSecond), false)
assert.equal(isClosedMonthlyPeriod('2026-09', augustSecond), false)
assert.equal(isClosedMonthlyPeriod('invalid', augustSecond), false)
assert.doesNotThrow(() => assertClosedMonthlyPeriod('2026-07', augustSecond))
assert.throws(() => assertClosedMonthlyPeriod('2026-08', augustSecond), /mes completamente terminado/)

const previewRoute = readFileSync(resolve(process.cwd(), 'app/api/management/reports/preview/route.ts'), 'utf8')
const sendRoute = readFileSync(resolve(process.cwd(), 'app/api/cron/send-ceo-report-brandbook/route.ts'), 'utf8')
const schedulesRoute = readFileSync(resolve(process.cwd(), 'app/api/management/schedules/route.ts'), 'utf8')
const schedulesPage = readFileSync(resolve(process.cwd(), 'app/dashboard/control/schedules/page.tsx'), 'utf8')
const dependencies = JSON.parse(readFileSync(resolve(process.cwd(), 'config/client-dependencies-status.json'), 'utf8'))

assert.match(previewRoute, /requireCapability\('management\.global\.read'\)/)
assert.match(previewRoute, /accessErrorResponse\(error\)/)
assert.match(previewRoute, /assertClosedMonthlyPeriod\(period\)/)
assert.match(previewRoute, /previousMonthBounds\(\)/)
assert.match(previewRoute, /Cache-Control': 'private, no-store, max-age=0'/)

assert.match(sendRoute, /authorizeDelivery\(req\)/)
assert.match(sendRoute, /getCronAuthorizationFailure/)
assert.match(sendRoute, /requireCapability\('management\.global\.read'\)/)
assert.match(sendRoute, /assertClosedMonthlyPeriod\(period\)/)
assert.doesNotMatch(sendRoute, /error:\s*String\(error\)/)
assert.match(sendRoute, /Cierre \$\{monthName\} \$\{year\}/)

const reportingApproval = dependencies.dependencies.find((item: { id:string }) => item.id === 'reporting-approval')
assert.ok(reportingApproval, 'reporting-approval dependency must exist')
assert.match(schedulesRoute, /reporting-approval/)
assert.match(schedulesRoute, /APPROVED_DEPENDENCY_STATUSES/)
assert.match(schedulesRoute, /status:\s*409/)
assert.match(schedulesPage, /Configuración bloqueada por aprobación del Cliente/)
if (reportingApproval.status === 'pending') {
  assert.match(schedulesRoute, /La programación está bloqueada hasta contar con calendario, destinatarios y reglas de reporting aprobados por el Cliente/)
}

const now = new Date('2026-08-01T09:00:00.000Z')
assert.equal(advanceSchedule('2026-08-01T09:00:00.000Z', 'monthly', now), '2026-09-01T09:00:00.000Z')
assert.equal(advanceSchedule('2026-05-01T09:00:00.000Z', 'quarterly', now), '2026-11-01T09:00:00.000Z')
assert.equal(advanceSchedule('2024-08-01T09:00:00.000Z', 'yearly', now), '2027-08-01T09:00:00.000Z')
assert.throws(() => advanceSchedule('invalid', 'monthly', now), /next_run_at inválido/)
assert.throws(() => advanceSchedule('2026-08-01T09:00:00.000Z', 'weekly', now), /Cadencia no soportada/)

console.log('Management report scheduling, route closure, client approval gate and authorization rules verified.')
