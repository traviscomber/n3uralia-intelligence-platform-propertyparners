import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const api = readFileSync('app/api/market/comparables/route.ts','utf8')
const component = readFileSync('components/market/market-comparable-connector.tsx','utf8')

test('API validates commercial capability before service-role market reads', () => {
  assert.match(api,/requireAnyCapability/)
  assert.match(api,/createServiceClient/)
  assert.match(api,/approvedPortalSourceIds/)
  assert.match(api,/portal-inmobiliario-vitacura-portal-houses/)
  assert.match(api,/portal-inmobiliario-vitacura-portal-apartments/)
  assert.match(api,/\.in\('source_id', approvedSourceIds\)/)
  assert.match(api,/\.eq\('status', 'active'\)/)
  assert.match(api,/\.is\('removed_at', null\)/)
  assert.match(api,/\.gt\('price_uf', 0\)/)
})
test('valuation case writes remain under authenticated RLS and explicit scoped approval', () => {
  assert.match(api,/assertProfileVisible\(scope, valuationCase\.requested_by\)/)
  assert.match(api,/supabase\.from\('valuation_comparables'\)\.insert/)
  assert.match(api,/supabase\.from\('valuation_decision_log'\)\.insert/)
  assert.doesNotMatch(api,/service\.from\('valuation_comparables'\)\.insert/)
  assert.doesNotMatch(api,/service\.from\('valuation_decision_log'\)\.insert/)
})
test('connector does not advertise a false empty state while server request fails', () => {
  assert.match(component,/setLoading\(true\)/)
  assert.match(component,/setLoadError/)
  assert.match(component,/No se pudieron consultar las publicaciones/)
  assert.match(component,/Cargando publicaciones/)
})
