import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

test('market refresh covers houses and apartments while release gate remains houses-only', () => {
  const cron = readFileSync('app/api/cron/market-refresh/route.ts','utf8')
  const migration = readFileSync('supabase/migrations/20260926180000_align_market_refresh_release_scope.sql','utf8')

  assert.match(cron,/const DATASETS: PortalDatasetKind\[\] = \['portal_houses', 'portal_apartments'\]/)
  assert.match(migration,/\('portal_houses'::text, true\)/)
  assert.match(migration,/\('portal_apartments'::text, false\)/)
  assert.match(migration,/\('portal_projects'::text, false\)/)
  assert.match(migration,/where required_for_release/i)
})

test('Portal automatic refresh is Firecrawl-free', () => {
  const refresh = readFileSync('app/api/cron/market-refresh/route.ts','utf8')
  const delta = readFileSync('app/api/cron/market-delta/route.ts','utf8')
  const vercel = readFileSync('vercel.json','utf8')

  assert.doesNotMatch(refresh,/firecrawl/i)
  assert.doesNotMatch(delta,/firecrawl/i)
  assert.match(delta,/brightdata-portal-collector/)
  assert.match(vercel,/\/api\/cron\/market-delta/)
  assert.match(vercel,/\/api\/cron\/market-refresh/)
  assert.match(vercel,/0 11,12 \* \* 0,3/)
  assert.match(refresh,/scheduledInventoryDataset/)
  assert.match(refresh,/local\.weekday === 'Sun'.*portal_houses/s)
  assert.match(refresh,/local\.weekday === 'Wed'.*portal_apartments/s)
  assert.match(refresh,/maintenance/)
  assert.equal(existsSync('lib/firecrawl-portal-collector.ts'), false)
})

test('optional portal datasets remain observable instead of being erased from health', () => {
  const migration = readFileSync('supabase/migrations/20260926180000_align_market_refresh_release_scope.sql','utf8')
  assert.match(migration,/market_source_refresh_health_all_v1/i)
  assert.match(migration,/required_for_release/i)
  assert.match(migration,/apartments\/projects remain visible as optional reference datasets/i)
})
