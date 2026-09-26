import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('review inbox surfaces learned aliases only as advisory intelligence', () => {
  const sql=readFileSync('supabase/migrations/20260926184500_surface_learned_neighborhood_advisory.sql','utf8')
  assert.match(sql,/get_market_learned_neighborhood_candidate_v1/)
  assert.match(sql,/learned_address_alias_v1/)
  assert.match(sql,/learned_address_alias_conflict/)
  assert.match(sql,/when sig\.neighborhood_id is null then false/)
  assert.match(sql,/noncanonical advisory signal/i)
  assert.doesNotMatch(sql,/update public\.market_properties/i)
  assert.doesNotMatch(sql,/insert into public\.market_neighborhood/i)
})

test('property inbox explains learned suggestions without enabling confirm action', () => {
  const ui=readFileSync('components/properties/property-review-inbox.tsx','utf8')
  assert.match(ui,/learned_address_alias_v1:'Patrón territorial aprendido'/)
  assert.match(ui,/learned_address_alias_conflict:'Patrón aprendido en conflicto'/)
  assert.match(ui,/La señal aprendida sirve para priorizar la revisión, pero no escribe barrio ni crea asignaciones/)
})

test('learned advisory confidence rendering uses PostgreSQL-safe numeric formatting', () => {
  const sql=readFileSync('supabase/migrations/20260926185500_fix_learned_neighborhood_advisory_confidence.sql','utf8')
  assert.match(sql,/round\(\(learned\.confidence\*100\)::numeric,1\)::text/)
  assert.doesNotMatch(sql,/%.1f/)
})
