import assert from 'node:assert/strict'
import {
  CANONICAL_DASHBOARD_ROLES,
  canAccessDashboardPath,
  getDefaultDashboardPath,
  normalizeDashboardRole,
} from '../lib/dashboard-access'

const canonicalRoles = ['admin', 'ceo', 'director', 'seller'] as const
assert.deepEqual(CANONICAL_DASHBOARD_ROLES, canonicalRoles)

const aliases = {
  admin: 'admin',
  ceo: 'ceo',
  director: 'director',
  board_director: 'director',
  account_director: 'director',
  seller: 'seller',
  agent: 'seller',
  agente: 'seller',
  executive: 'seller',
} as const

for (const [input, expected] of Object.entries(aliases)) {
  assert.equal(normalizeDashboardRole(input), expected)
  assert.equal(normalizeDashboardRole(`  ${input.toUpperCase()}  `), expected)
}

for (const role of [null, undefined, '', 'unauthorized', 'owner']) {
  assert.equal(normalizeDashboardRole(role), null)
  assert.equal(getDefaultDashboardPath(role), null)
}

assert.equal(getDefaultDashboardPath('admin'), '/dashboard/ceo')
assert.equal(getDefaultDashboardPath('ceo'), '/dashboard/ceo')
assert.equal(getDefaultDashboardPath('director'), '/dashboard/director')
assert.equal(getDefaultDashboardPath('seller'), '/dashboard/agente')
assert.equal(getDefaultDashboardPath('board_director'), '/dashboard/director')
assert.equal(getDefaultDashboardPath('executive'), '/dashboard/agente')

for (const role of ['ceo', 'admin']) {
  assert.equal(canAccessDashboardPath(role, '/dashboard/ceo'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/settings'), true)
  assert.equal(canAccessDashboardPath(role, '/dashboard/datos-crm'), true)
}

assert.equal(canAccessDashboardPath('director', '/dashboard/control'), true)
assert.equal(canAccessDashboardPath('director', '/dashboard/datos-crm'), true)
assert.equal(canAccessDashboardPath('director', '/dashboard/settings'), false)
assert.equal(canAccessDashboardPath('director', '/dashboard/settings/profile'), false)
assert.equal(canAccessDashboardPath('director', '/dashboard/ml-lab'), false)
assert.equal(canAccessDashboardPath('board_director', '/dashboard/control'), true)

assert.equal(canAccessDashboardPath('seller', '/dashboard'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/agente'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/properties'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/properties/123'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/comunas'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/fuentes'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/fuentes/123'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/market/import'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/valorizador'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/reportes/audiencias/ejecutivo'), true)
assert.equal(canAccessDashboardPath('seller', '/dashboard/inteligencia'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/datos-crm'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/metas'), false)
assert.equal(canAccessDashboardPath('agent', '/dashboard/properties'), true)
assert.equal(canAccessDashboardPath('executive', '/dashboard/settings'), false)

// Route matching must stop at path-segment boundaries.
assert.equal(canAccessDashboardPath('seller', '/dashboard/properties-archive'), false)
assert.equal(canAccessDashboardPath('seller', '/dashboard/marketplace'), false)
assert.equal(canAccessDashboardPath('director', '/dashboard/settings-malicious'), true)

assert.equal(canAccessDashboardPath('unauthorized', '/dashboard'), false)
assert.equal(canAccessDashboardPath('', '/dashboard/properties'), false)

console.log('Dashboard role normalization, defaults and access boundaries verified.')
