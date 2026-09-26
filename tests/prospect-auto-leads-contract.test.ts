import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('prospect automation creates leads only from confirmed barrio group and current group owner', () => {
  const sql = readFileSync('supabase/migrations/20260926173000_property_territory_groups.sql', 'utf8')
  const refreshFn = sql.split('create or replace function public.refresh_property_prospect_leads_v1()')[1]
  assert.ok(refreshFn)
  assert.match(refreshFn, /join public\.property_territory_group_neighborhoods/i)
  assert.match(refreshFn, /join public\.property_territory_groups/i)
  assert.match(refreshFn, /join public\.property_territory_group_director_assignments/i)
  assert.match(refreshFn, /assignment_role='primary'/i)
  assert.match(refreshFn, /gn\.active/i)
  assert.match(refreshFn, /gn\.valid_to is null/i)
  assert.match(refreshFn, /l\.property_id is not null/i)
  assert.match(refreshFn, /portal-inmobiliario-vitacura-portal-houses/i)
  assert.match(refreshFn, /l\.status in \('active','observed'\)/i)
  assert.match(refreshFn, /on conflict \(property_id\) do nothing/i)
  assert.match(refreshFn, /property_prospect_events/i)
  assert.match(refreshFn, /property_prospect_group_territory_v2/i)
  assert.match(refreshFn, /security invoker/i)
  assert.match(refreshFn, /set search_path=''/i)
  assert.match(refreshFn, /grant execute on function public\.refresh_property_prospect_leads_v1\(\) to service_role/i)
  assert.doesNotMatch(refreshFn, /market_neighborhood_director_assignments/i)
})

test('daily market cron refreshes identity intelligence before prospect leads', () => {
  const route = readFileSync('app/api/cron/market-refresh/route.ts', 'utf8')
  const identityIndex = route.indexOf("refresh_market_listing_property_match_candidates_v1")
  const prospectIndex = route.indexOf("refresh_property_prospect_leads_v1")
  assert.ok(identityIndex >= 0)
  assert.ok(prospectIndex > identityIndex)
})
