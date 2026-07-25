import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import {
  DASHBOARD_ROLES,
  DASHBOARD_ROUTES,
  canAccessDashboardPath,
  getDashboardRoute,
  getDefaultDashboardPath,
  getNavigationSections,
  normalizeDashboardRole,
} from '../lib/dashboard-route-contract'

const repositoryRoot = process.cwd()
const dashboardRoot = join(repositoryRoot, 'app', 'dashboard')

function collectDashboardPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)

    if (entry.isDirectory()) return collectDashboardPages(absolutePath)
    if (!entry.isFile() || entry.name !== 'page.tsx') return []

    const directoryPath = relative(dashboardRoot, directory)
    const routeSuffix = directoryPath
      ? `/${directoryPath.split(sep).join('/')}`
      : ''

    return [`/dashboard${routeSuffix}`]
  })
}

assert.equal(existsSync(dashboardRoot), true, 'app/dashboard must exist')

const routeKeys = new Set<string>()
const routeHrefs = new Set<string>()

for (const route of DASHBOARD_ROUTES) {
  assert.equal(routeKeys.has(route.key), false, `Duplicate dashboard route key: ${route.key}`)
  assert.equal(routeHrefs.has(route.href), false, `Duplicate dashboard route href: ${route.href}`)
  routeKeys.add(route.key)
  routeHrefs.add(route.href)

  assert.equal(route.href.startsWith('/dashboard'), true, `Dashboard route must stay under /dashboard: ${route.href}`)
  assert.equal(route.roles.length > 0, true, `Dashboard route must authorize at least one role: ${route.href}`)

  for (const role of route.roles) {
    assert.equal(DASHBOARD_ROLES.includes(role), true, `Unknown role ${role} on ${route.href}`)
    assert.equal(canAccessDashboardPath(role, route.href), true, `${role} cannot access configured route ${route.href}`)

    const group = route.groupByRole[role]
    if (group) {
      const visibleRoutes = getNavigationSections(role).flatMap((section) => section.items.map((item) => item.href))
      assert.equal(visibleRoutes.includes(route.href), true, `${route.href} is grouped for ${role} but missing from navigation`)
    }
  }

  for (const role of DASHBOARD_ROLES) {
    if (!route.roles.includes(role)) {
      assert.equal(canAccessDashboardPath(role, route.href), false, `${role} unexpectedly accesses ${route.href}`)
      assert.equal(route.groupByRole[role], undefined, `${route.href} is visible to unauthorized role ${role}`)
    }
  }
}

for (const role of DASHBOARD_ROLES) {
  const defaultPath = getDefaultDashboardPath(role)
  assert.equal(canAccessDashboardPath(role, defaultPath), true, `Default route ${defaultPath} is inaccessible to ${role}`)

  const navigationHrefs = getNavigationSections(role).flatMap((section) => section.items.map((item) => item.href))
  assert.equal(new Set(navigationHrefs).size, navigationHrefs.length, `Duplicate navigation route for ${role}`)

  for (const href of navigationHrefs) {
    assert.equal(canAccessDashboardPath(role, href), true, `Navigation exposes inaccessible route ${href} to ${role}`)
  }
}

for (const pathname of collectDashboardPages(dashboardRoot)) {
  assert.notEqual(getDashboardRoute(pathname), null, `Dashboard page has no route contract: ${pathname}`)
}

assert.equal(normalizeDashboardRole('account_director'), 'director')
assert.equal(normalizeDashboardRole('board_director'), 'director')
assert.equal(normalizeDashboardRole('executive'), 'seller')
assert.equal(normalizeDashboardRole('unauthorized'), null)
assert.equal(canAccessDashboardPath('unauthorized', '/dashboard'), false)
assert.equal(canAccessDashboardPath('', '/dashboard/properties'), false)
assert.equal(canAccessDashboardPath('admin', '/dashboard/not-registered'), false)

console.log(
  `Dashboard access contract verified: ${DASHBOARD_ROUTES.length} route definitions, ${DASHBOARD_ROLES.length} roles and ${collectDashboardPages(dashboardRoot).length} filesystem pages.`,
)
