import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('prospect automation only creates leads from confirmed territory and current canonical identity', () => {
  const sql = readFileSync('supabase/migrations/20260926141000_auto_prospect_leads_from_confirmed_territory.sql', 'utf8')
  assert.match(sql, /join public\.market_neighborhood_director_assignments/i)
  assert.match(sql, /t\.active/i)
  assert.match(sql, /t\.valid_to is null/i)
  assert.match(sql, /l\.property_id is not null/i)
  assert.match(sql, /portal-inmobiliario-vitacura-portal-houses/i)
  assert.match(sql, /l\.status in \('active','observed'\)/i)
  assert.match(sql, /on conflict \(property_id\) do nothing/i)
  assert.match(sql, /property_prospect_events/i)
  assert.match(sql, /lead_created/i)
  assert.match(sql, /director_assigned/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
  assert.match(sql, /grant execute on function public\.refresh_property_prospect_leads_v1\(\) to service_role/i)
  assert.doesNotMatch(sql, /insert into public\.market_neighborhood_director_assignments[\s\S]*select[\s\S]*vitacura_market_neighborhoods/i)
})

test('daily market cron refreshes identity intelligence before prospect leads', () => {
  const route = readFileSync('app/api/cron/market-refresh/route.ts', 'utf8')
  const identityIndex = route.indexOf("refresh_market_listing_property_match_candidates_v1")
  const prospectIndex = route.indexOf("refresh_property_prospect_leads_v1")
  assert.ok(identityIndex >= 0)
  assert.ok(prospectIndex > identityIndex)
})
