import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../lib/access-control.ts', import.meta.url), 'utf8')

const expected = {
  ceo: ['dashboard.global.read', 'valuations.global.approve', 'reports.global.read'],
  admin: ['users.manage', 'settings.manage', 'market.manage_sources'],
  director: ['dashboard.office.read', 'properties.office.assign', 'valuations.office.review'],
  subdirector: ['dashboard.office.read', 'management.office.manage', 'reports.office.read'],
  seller: ['dashboard.self.read', 'valuations.self.create', 'reports.self.read'],
}

for (const [role, capabilities] of Object.entries(expected)) {
  for (const capability of capabilities) {
    assert.match(source, new RegExp(`['\"]${capability.replaceAll('.', '\\.')}['\"]`), `${role} must declare ${capability}`)
  }
}

assert.match(source, /ceo.*?global/s)
assert.match(source, /director.*?office/s)
assert.match(source, /seller.*?self/s)
assert.match(source, /defaultDashboardForRole/)
assert.match(source, /\/dashboard\/ceo/)
assert.match(source, /\/dashboard\/director/)
assert.match(source, /\/dashboard\/partner/)

const sidebar = readFileSync(new URL('../components/layout/sidebar.tsx', import.meta.url), 'utf8')
assert.match(sidebar, /hasCapability/)
assert.doesNotMatch(sidebar, /isExecutive\s*=/)
assert.doesNotMatch(sidebar, /isDirector\s*=/)

const login = readFileSync(new URL('../app/auth/login/page.tsx', import.meta.url), 'utf8')
assert.match(login, /defaultDashboardForRole/)
assert.match(login, /router\.replace/)

console.log('Access-control regression checks passed')
