import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CANONICAL_DASHBOARD_ROLES,
  canAccessDashboardPath,
  getDefaultDashboardPath,
  normalizeDashboardRole,
} from '../lib/dashboard-access'

describe('dashboard role contract', () => {
  it('exposes the canonical role set', () => {
    assert.deepEqual(CANONICAL_DASHBOARD_ROLES, ['admin', 'ceo', 'director', 'seller'])
  })

  it('normalizes aliases, casing and whitespace', () => {
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
  })

  it('rejects empty and unknown roles', () => {
    for (const role of [null, undefined, '', 'unauthorized', 'owner']) {
      assert.equal(normalizeDashboardRole(role), null)
      assert.equal(getDefaultDashboardPath(role), null)
    }
  })

  it('maps canonical roles and aliases to default dashboards', () => {
    assert.equal(getDefaultDashboardPath('admin'), '/dashboard/ceo')
    assert.equal(getDefaultDashboardPath('ceo'), '/dashboard/ceo')
    assert.equal(getDefaultDashboardPath('director'), '/dashboard/director')
    assert.equal(getDefaultDashboardPath('board_director'), '/dashboard/director')
    assert.equal(getDefaultDashboardPath('seller'), '/dashboard/agente')
    assert.equal(getDefaultDashboardPath('executive'), '/dashboard/agente')
  })
})

describe('dashboard path authorization', () => {
  it('allows administrators and CEOs to access every dashboard area', () => {
    for (const role of ['admin', 'ceo']) {
      assert.equal(canAccessDashboardPath(role, '/dashboard/ceo'), true)
      assert.equal(canAccessDashboardPath(role, '/dashboard/settings'), true)
      assert.equal(canAccessDashboardPath(role, '/dashboard/datos-crm'), true)
    }
  })

  it('allows directors except in executive-only areas', () => {
    assert.equal(canAccessDashboardPath('director', '/dashboard/control'), true)
    assert.equal(canAccessDashboardPath('director', '/dashboard/datos-crm'), true)
    assert.equal(canAccessDashboardPath('director', '/dashboard/settings'), false)
    assert.equal(canAccessDashboardPath('director', '/dashboard/settings/profile'), false)
    assert.equal(canAccessDashboardPath('director', '/dashboard/ml-lab'), false)
    assert.equal(canAccessDashboardPath('board_director', '/dashboard/control'), true)
  })

  it('limits sellers to explicitly allowed dashboard areas', () => {
    const allowed = [
      '/dashboard',
      '/dashboard/agente',
      '/dashboard/properties',
      '/dashboard/properties/123',
      '/dashboard/market',
      '/dashboard/market/comunas',
      '/dashboard/valorizador',
      '/dashboard/reportes/audiencias/ejecutivo',
    ]

    const denied = [
      '/dashboard/market/fuentes',
      '/dashboard/market/fuentes/123',
      '/dashboard/market/import',
      '/dashboard/inteligencia',
      '/dashboard/datos-crm',
      '/dashboard/metas',
      '/dashboard/settings',
    ]

    for (const pathname of allowed) {
      assert.equal(canAccessDashboardPath('seller', pathname), true)
    }

    for (const pathname of denied) {
      assert.equal(canAccessDashboardPath('seller', pathname), false)
    }

    assert.equal(canAccessDashboardPath('agent', '/dashboard/properties'), true)
    assert.equal(canAccessDashboardPath('executive', '/dashboard/settings'), false)
  })

  it('matches complete path segments instead of string prefixes', () => {
    assert.equal(canAccessDashboardPath('seller', '/dashboard/properties-archive'), false)
    assert.equal(canAccessDashboardPath('seller', '/dashboard/marketplace'), false)
    assert.equal(canAccessDashboardPath('director', '/dashboard/settings-malicious'), true)
  })

  it('denies unknown roles', () => {
    assert.equal(canAccessDashboardPath('unauthorized', '/dashboard'), false)
    assert.equal(canAccessDashboardPath('', '/dashboard/properties'), false)
  })
})
