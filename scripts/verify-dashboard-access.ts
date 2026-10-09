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

// Approved top-level architecture. Each role sees only these three pillars.
// All previous destinations remain available under a single collapsed section.
const expectedReportRoute: Record<string, string> = {
  ceo: '/dashboard/reportes/canonicos',
  admin: '/dashboard/reportes/canonicos',
  director: '/dashboard/director/reporte',
  subdirector: '/dashboard/director/reporte',
  seller: '/dashboard/reportes/audiencias/ejecutivo',
}
for (const [role, sections] of Object.entries(navigationByRole)) {
  assert.equal(sections.length, 2, `${role} must have two navigation sections`)
  assert.equal(sections[0]?.label, 'Tres pilares')
  assert.deepEqual(sections[0]?.items.map((item) => item.label), ['Mercado', 'Valorizador', 'Reportes'])
  assert.deepEqual(sections[0]?.items.map((item) => item.href), [
    '/dashboard/market',
    '/dashboard/valuation',
    expectedReportRoute[role],
  ])
  assert.equal(sections[1]?.label, 'Más herramientas')
  assert.ok(sections[1].items.length > 0)
  assert.ok(sections[1].items.every((item) => Boolean(item.group)), `${role} has ungrouped secondary links`)
  assert.equal(sections[1].items[0]?.label, 'Hoy')
  const hrefs = sections.flatMap((section) => section.items.map((item) => item.href))
  assert.equal(new Set(hrefs).size, hrefs.length, `${role} has duplicate navigation destinations`)
}

console.log('Dashboard access and the three approved pillars (Mercado, Valorizador, Reportes) verified for all five roles; secondary tools retain existing scopes.')
