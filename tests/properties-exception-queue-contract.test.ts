import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('manager properties view is exceptions-only for unresolved barrio classification', () => {
  const page = readFileSync('app/dashboard/properties/page.tsx','utf8')
  assert.match(page,/Propiedades por resolver/i)
  assert.match(page,/Bandeja de revisión/i)
  assert.match(page,/get_ceo_market_neighborhood_queue_v1/i)
  assert.match(page,/requieren una decisión humana/i)
  assert.match(page,/continúa automáticamente hacia Leads\/Ficha 360/i)
  const inbox = readFileSync('components/properties/property-review-inbox.tsx','utf8')
  assert.match(inbox,/Pendientes/i)
  assert.match(inbox,/Hoy/i)
  assert.match(inbox,/>48 h/i)
  assert.match(inbox,/Confirmar barrio/i)
  assert.match(inbox,/\/api\/properties\/review/i)
})

test('seller properties view keeps own assigned portfolio', () => {
  const page = readFileSync('app/dashboard/properties/page.tsx','utf8')
  assert.match(page,/properties\.global\.assign/i)
  assert.match(page,/properties\.office\.assign/i)
  assert.match(page,/title="Mi cartera"/i)
  assert.match(page,/property_assignments/i)
})
