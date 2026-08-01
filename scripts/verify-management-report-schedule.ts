import assert from 'node:assert/strict'
import {
  advanceSchedule,
  canRunManagementReports,
  getCronAuthorizationFailure,
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

const now = new Date('2026-08-01T09:00:00.000Z')
assert.equal(advanceSchedule('2026-08-01T09:00:00.000Z', 'monthly', now), '2026-09-01T09:00:00.000Z')
assert.equal(advanceSchedule('2026-05-01T09:00:00.000Z', 'quarterly', now), '2026-11-01T09:00:00.000Z')
assert.equal(advanceSchedule('2024-08-01T09:00:00.000Z', 'yearly', now), '2027-08-01T09:00:00.000Z')
assert.throws(() => advanceSchedule('invalid', 'monthly', now), /next_run_at inválido/)
assert.throws(() => advanceSchedule('2026-08-01T09:00:00.000Z', 'weekly', now), /Cadencia no soportada/)

console.log('Management report scheduling and authorization rules verified.')
