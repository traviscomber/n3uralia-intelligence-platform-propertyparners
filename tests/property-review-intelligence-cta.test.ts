import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('property review inbox exposes visible intelligence CTAs', () => {
  const inbox = readFileSync('components/properties/property-review-inbox.tsx','utf8')
  assert.match(inbox,/Agregar a inteligencia/i)
  assert.match(inbox,/Confirmar barrio/i)
  assert.match(inbox,/Ver Portal/i)
  assert.match(inbox,/sticky top-0/i)
  assert.match(inbox,/Abrir inteligencia 360/i)
  assert.match(inbox,/add_to_intelligence/i)
})

test('intelligence promotion remains human reviewed and identity-safe', () => {
  const sql = readFileSync('supabase/migrations/20260926162000_promote_review_to_property_intelligence.sql','utf8')
  assert.match(sql,/AAL2 required/i)
  assert.match(sql,/director','subdirector/i)
  assert.match(sql,/resolve_market_neighborhood_signal_v2/i)
  assert.match(sql,/identity_status,\s*identity_confidence/i)
  assert.match(sql,/'candidate',\s*0\.90/i)
  assert.match(sql,/identity is not auto-confirmed/i)
})
