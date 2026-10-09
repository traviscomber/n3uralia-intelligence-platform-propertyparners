import assert from 'node:assert/strict'
import { canAccessDashboardPath } from '../lib/dashboard-access'
import { ADMIN_NAVIGATION, CEO_NAVIGATION, DIRECTOR_NAVIGATION, SELLER_NAVIGATION } from '../lib/navigation'

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

const navigationByRole = {
  ceo: CEO_NAVIGATION,
  admin: ADMIN_NAVIGATION,
  director: DIRECTOR_NAVIGATION,
  subdirector: DIRECTOR_NAVIGATION,
  seller: SELLER_NAVIGATION,
} as const

for (const [role, sections] of Object.entries(navigationByRole)) {
  for (const section of sections) {
    for (const item of section.items) {
      assert.equal(
        canAccessDashboardPath(role, item.href),
        true,
        `${role} navigation item ${item.label} points to forbidden route ${item.href}`,
      )
    }
  }
}

const expectedLabels = ['Mercado', 'Valorizador', 'Reportes']
const reportPillarByRole = {
  ceo: '/dashboard/reportes/canonicos',
  admin: '/dashboard/reportes/canonicos',
  director: '/dashboard/director/reporte',
  subdirector: '/dashboard/director/reporte',
  seller: '/dashboard/reportes/audiencias/ejecutivo',
} as const
const expectedRoutes = {
  ceo: ['/dashboard/ceo', '/dashboard/market', '/dashboard/valuation', '/dashboard/valuations', '/dashboard/control/operations', '/dashboard/properties', '/dashboard/reportes/canonicos'],
  admin: ['/dashboard', '/dashboard/market', '/dashboard/valuation', '/dashboard/valuations', '/dashboard/properties', '/dashboard/reportes/canonicos', '/dashboard/control/operations', '/dashboard/control/admin', '/dashboard/properties/admin', '/dashboard/market/fuentes', '/dashboard/settings'],
  director: ['/dashboard/director', '/dashboard/market', '/dashboard/valuation', '/dashboard/valuations', '/dashboard/properties', '/dashboard/director/reporte', '/dashboard/control/operations', '/dashboard/control/admin', '/dashboard/properties/admin'],
  subdirector: ['/dashboard/director', '/dashboard/market', '/dashboard/valuation', '/dashboard/valuations', '/dashboard/properties', '/dashboard/director/reporte', '/dashboard/control/operations', '/dashboard/control/admin', '/dashboard/properties/admin'],
  seller: ['/dashboard/partner', '/dashboard/market', '/dashboard/valuation', '/dashboard/valuations', '/dashboard/properties', '/dashboard/reportes/audiencias/ejecutivo'],
} as const

for (const [role, sections] of Object.entries(navigationByRole)) {
  assert.equal(sections.length, 2, role + ': unexpected extra navigation section')
  assert.equal(sections[0].label, 'Tres pilares', role)
  assert.deepEqual(sections[0].items.map((item) => item.label), expectedLabels, role)
  assert.deepEqual(sections[0].items.map((item) => item.href), [
    '/dashboard/market',
    '/dashboard/valuation',
    reportPillarByRole[role as keyof typeof reportPillarByRole],
  ], role)
  assert.equal(sections[1]?.label, 'Más herramientas', role)
  assert.ok(sections[1].items.every((item) => Boolean(item.group)), role + ': secondary tool missing group')
  assert.equal(sections[1].items[0].label, 'Hoy')
  const routes = sections.flatMap((section) => section.items.map((item) => item.href))
  assert.equal(new Set(routes).size, routes.length, role + ': route duplicated')
  assert.deepEqual(new Set(routes), new Set(expectedRoutes[role as keyof typeof expectedRoutes]), role + ': missing route')
}
console.log('Dashboard role navigation verified: Mercado, Valorizador and Reportes with all previous authorized routes retained.')
