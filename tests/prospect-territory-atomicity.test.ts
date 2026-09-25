import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('territory reassignment is transactional, locked and propagates active lead responsibility', () => {
  const sql = readFileSync('supabase/migrations/20260925125000_atomic_neighborhood_director_assignment.sql', 'utf8')
  assert.match(sql, /security invoker/i)
  assert.match(sql, /set search_path = ''/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
  assert.match(sql, /for update/i)
  assert.match(sql, /status in \('new','assigned','contacting','qualified','valuation','proposal'\)/i)
  assert.match(sql, /director_key is distinct from p_director_key/i)
  assert.match(sql, /event_type[\s\S]*director_reassigned/i)
  assert.match(sql, /grant execute on function[\s\S]*to service_role/i)
  assert.match(sql, /revoke execute on function[\s\S]*from authenticated/i)
})
