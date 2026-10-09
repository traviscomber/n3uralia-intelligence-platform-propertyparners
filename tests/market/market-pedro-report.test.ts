import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const printable = readFileSync('app/dashboard/market/export/page.tsx','utf8')
const exportApi = readFileSync('app/api/market/export/route.ts','utf8')

test('market report separates both property types and first-seen listings', () => {
  assert.match(printable,/loadPedroMarketOverview\(\)/)
  assert.match(printable,/Nuevos hoy/)
  assert.match(printable,/Compraventas registradas/)
  assert.match(printable,/CBRS/)
  assert.match(printable,/source_id/)
  assert.match(printable,/portal-inmobiliario-vitacura-portal-houses/)
  assert.match(printable,/portal-inmobiliario-vitacura-portal-apartments/)
  assert.doesNotMatch(printable,/getOperationalMarketSnapshot/)
})
test('listing export authorizes then filters only approved Vitacura Portal sources', () => {
  assert.match(exportApi,/requireCapability\('market\.read'\)/)
  assert.match(exportApi,/createServiceClient/)
  assert.match(exportApi,/\.in\('source_id', ids\)/)
  assert.match(exportApi,/\.eq\('status', 'active'\)/)
  assert.match(exportApi,/\.is\('removed_at', null\)/)
  assert.match(exportApi,/portal-inmobiliario-vitacura-portal-houses/)
  assert.match(exportApi,/portal-inmobiliario-vitacura-portal-apartments/)
})
test('canonical annual CBRS metrics replace empty event-level exports in executive summary', () => {
  assert.match(exportApi,/loadPedroMarketOverview\(\)/)
  assert.match(exportApi,/registered_residential_sales/)
  assert.match(exportApi,/market_current_listings/)
  assert.match(exportApi,/market_transactions/)
  assert.match(exportApi,/XLSX\.utils\.book_new/)
})
