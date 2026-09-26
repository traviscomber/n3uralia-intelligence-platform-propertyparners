import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('market release freshness follows the current houses-only operational cron scope', () => {
  const cron = readFileSync('app/api/cron/market-refresh/route.ts','utf8')
  const migration = readFileSync('supabase/migrations/20260926180000_align_market_refresh_release_scope.sql','utf8')

  assert.match(cron,/const DATASETS: PortalDatasetKind\[\] = \['portal_houses'\]/)
  assert.match(migration,/\('portal_houses'::text, true\)/)
  assert.match(migration,/\('portal_apartments'::text, false\)/)
  assert.match(migration,/\('portal_projects'::text, false\)/)
  assert.match(migration,/where required_for_release/i)
})

test('optional portal datasets remain observable instead of being erased from health', () => {
  const migration = readFileSync('supabase/migrations/20260926180000_align_market_refresh_release_scope.sql','utf8')
  assert.match(migration,/market_source_refresh_health_all_v1/i)
  assert.match(migration,/required_for_release/i)
  assert.match(migration,/apartments\/projects remain visible as optional reference datasets/i)
})
