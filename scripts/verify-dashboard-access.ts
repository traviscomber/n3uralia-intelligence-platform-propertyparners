import assert from 'node:assert/strict'
import { canAccessDashboardPath } from '../lib/dashboard-access'

for (const role of ['ceo', 'admin']) {
  assert.equal(canAccessDashboardPath(role, '/dashboard/ceo'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/settings'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/datos-crm'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/reconciliacion'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/reports'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/schedules'), true)
}

for (const role of ['director', 'subdirector']) {
  assert.equal(canAccessDashboardPath(role, '/dashboard/control'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/director'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/datos-crm'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/reconciliacion'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/reports'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/control/schedules'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/settings'), false)
  assert.equal(canAccessDashboardPath(role, '/dashboard/market/import'), false)
  assert.equal(canAccessDashboardPath(role, '/dashboard/reportes/autonomos'), false)
  assert.equal(canAccessDashboardPath(role, '/dashboard/ml-lab'), false)
}

assert.equal(canAccessDashboardPath('seller', '/dashboard'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/properties'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/fuentes'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/import'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/valorizador'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/reportes/audiencias/ejecutivo'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/control'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/control/reports'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/control/schedules'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/control/reconciliacion'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/inteligencia'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/datos-crm'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/metas'), false)
assert.equal(canAccessDashboardPath('unauthorized', '/dashboard'), false)
assert.equal(canAccessDashboardPath('', '/dashboard/properties'), false)

console.log('Dashboard access verified for CEO, admin, director, subdirector and seller route boundaries, including management reports and schedules.')
