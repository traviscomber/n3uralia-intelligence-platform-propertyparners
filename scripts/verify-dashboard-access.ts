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

const canonicalBusinessSections = [
  'Resumen',
  'Control de gestión',
  'Inteligencia de negocios',
  'Valorizador de propiedades',
]

for (const [role, sections] of Object.entries(navigationByRole)) {
  const expected = role === 'ceo'
    ? [...canonicalBusinessSections, 'Administración']
    : canonicalBusinessSections
  assert.deepEqual(
    sections.map((section) => section.label),
    expected,
    `${role} navigation must preserve the canonical Property Partners information architecture`,
  )
  assert.equal(sections[0]?.items.some((item) => item.label === 'Hoy'), true)
  assert.equal(sections[1]?.items.length > 0, true)
  assert.equal(sections[2]?.items.length > 0, true)
  assert.equal(sections[3]?.items.length > 0, true)
}

assert.equal(CEO_NAVIGATION.flatMap((section) => section.items).length, 10)
assert.equal(ADMIN_NAVIGATION.flatMap((section) => section.items).length, 10)
assert.equal(DIRECTOR_NAVIGATION.flatMap((section) => section.items).length, 8)
assert.equal(SELLER_NAVIGATION.flatMap((section) => section.items).length, 5)

console.log('Dashboard access and canonical three-pillar role navigation verified for CEO, admin, director, subdirector and seller.')
