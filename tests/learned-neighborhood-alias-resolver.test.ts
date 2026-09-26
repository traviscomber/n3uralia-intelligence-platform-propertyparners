import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('learned neighborhood aliases use conservative support and confidence gates', () => {
  const sql = readFileSync('supabase/migrations/20260926170000_learned_neighborhood_alias_resolver.sql','utf8')
  assert.match(sql,/total_rows>=5/i)
  assert.match(sql,/0\.95/i)
  assert.match(sql,/canonical_write',false/i)
  assert.match(sql,/live_resolved_portal_houses/i)
  assert.match(sql,/conflict boolean/i)
})

test('learned candidate resolver does not write canonical neighborhood state', () => {
  const sql = readFileSync('supabase/migrations/20260926170000_learned_neighborhood_alias_resolver.sql','utf8')
  const candidateFn = sql.split('create or replace function private.get_market_learned_neighborhood_candidate_v1')[1]
  assert.ok(candidateFn)
  assert.doesNotMatch(candidateFn,/update public\.market_properties/i)
  assert.doesNotMatch(candidateFn,/insert into public\.market_neighborhood_review_items/i)
  assert.doesNotMatch(candidateFn,/update public\.market_neighborhood_review_items/i)
})
