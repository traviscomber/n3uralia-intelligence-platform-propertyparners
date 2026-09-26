import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('manager properties view is exceptions-only for unresolved barrio classification', () => {
  const page = readFileSync('app/dashboard/properties/page.tsx','utf8')
  assert.match(page,/Propiedades por resolver/i)
  assert.match(page,/Sólo excepciones/i)
  assert.match(page,/get_ceo_market_neighborhood_queue_v1/i)
  assert.match(page,/Las propiedades con barrio resuelto salen de esta cola/i)
  assert.match(page,/continúan automáticamente hacia Leads\/Ficha 360/i)
})

test('seller properties view keeps own assigned portfolio', () => {
  const page = readFileSync('app/dashboard/properties/page.tsx','utf8')
  assert.match(page,/properties\.global\.assign/i)
  assert.match(page,/properties\.office\.assign/i)
  assert.match(page,/title="Mi cartera"/i)
  assert.match(page,/property_assignments/i)
})
