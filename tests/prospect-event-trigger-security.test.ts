import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('prospect event immutability trigger has a pinned search path and no direct client execution', () => {
  const migration = readFileSync('supabase/migrations/20260925124700_harden_prospect_event_trigger.sql', 'utf8')
  assert.match(migration, /alter function public\.prevent_property_prospect_event_mutation\(\)[\s\S]*set search_path = '';/)
  assert.match(migration, /revoke execute on function public\.prevent_property_prospect_event_mutation\(\) from public;/)
  assert.match(migration, /revoke execute on function public\.prevent_property_prospect_event_mutation\(\) from anon;/)
  assert.match(migration, /revoke execute on function public\.prevent_property_prospect_event_mutation\(\) from authenticated;/)
})
