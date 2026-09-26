import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { canAccessDashboardPath } from '../lib/dashboard-access'

test('hot auth path uses claims without Auth user-record round trips', () => {
  const proxy = readFileSync('lib/supabase/proxy.ts', 'utf8')
  const proxyEntry = readFileSync('proxy.ts', 'utf8')
  const layout = readFileSync('app/dashboard/layout.tsx', 'utf8')

  assert.match(proxy, /auth\.getClaims\(\)/)
  assert.doesNotMatch(proxy, /auth\.getUser\(\)/)
  assert.match(proxy, /isPublicPage \|\| pathname === '\/auth\/error'/)
  assert.match(proxyEntry, /'\/dashboard\/:path\*'/)
  assert.match(proxyEntry, /'\/api\/:path\*'/)
  assert.doesNotMatch(proxyEntry, /\/\(\(\?!_next\/static/)
  assert.match(layout, /auth\.getClaims\(\)/)
  assert.doesNotMatch(layout, /auth\.getUser\(\)/)
})

test('seller account route is reachable and speculative prefetch is disabled', () => {
  const topbar = readFileSync('components/layout/topbar.tsx', 'utf8')
  const valuations = readFileSync('app/dashboard/valuations/page.tsx', 'utf8')
  const properties = readFileSync('app/dashboard/properties/page.tsx', 'utf8')
  const market = readFileSync('app/dashboard/market/page.tsx', 'utf8')

  assert.equal(canAccessDashboardPath('seller', '/dashboard/cuenta'), true)
  assert.match(topbar, /href="\/dashboard\/cuenta"[\s\S]{0,120}prefetch=\{false\}/)
  assert.match(valuations, /href=\{\`\/dashboard\/valuations\/\$\{item\.id\}\`\}[\s\S]{0,80}prefetch=\{false\}/)
  assert.match(properties, /href=\{\`\/dashboard\/properties\/\$\{property\.id\}\`\}[\s\S]{0,80}prefetch=\{false\}/)
  assert.match(market, /href=\{\`\/dashboard\/properties\/\$\{property\.id\}\`\}[\s\S]{0,80}prefetch=\{false\}/)
})

test('seller scope avoids visibility RPC fan-out', () => {
  const scope = readFileSync('lib/user-scope.ts', 'utf8')
  assert.match(scope, /access\.scope === 'self' \? Promise\.resolve\(\[profile\.id\]\) : resolveVisibleProfileIds\(supabase\)/)
  assert.match(scope, /access\.scope === 'self'[\s\S]{0,160}Promise\.resolve\(entity\?\.id \? \[entity\.id\] : \[\]\)/)
})

test('Portal live snapshot filters canonical collectors before transferring rows', () => {
  const portal = readFileSync('lib/portal-reference-intelligence.ts', 'utf8')
  assert.match(portal, /portal-inmobiliario-vitacura-portal-houses/)
  assert.match(portal, /market_sources!inner\(code,metadata\)/)
  assert.match(portal, /\.in\('market_sources\.code', LIVE_SOURCE_CODES\)/)
  assert.doesNotMatch(portal, /portal-inmobiliario-vitacura-\$\{kind\}/)
})
