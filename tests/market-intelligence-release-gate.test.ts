import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('market release uses listing-level source identity without promoting unresolved properties', () => {
  const sql=readFileSync('supabase/migrations/20260926183000_harden_market_scope_and_listing_release.sql','utf8')
  assert.match(sql,/market_current_listings_production_v3/i)
  assert.match(sql,/identity_level/i)
  assert.match(sql,/source_listing/i)
  assert.match(sql,/canonical_property_linked/i)
  assert.match(sql,/production_listing_rows=0/i)
  assert.doesNotMatch(sql,/production_property_rows=0 then 'no_publishable_market/i)
})

test('market properties authenticated read is scoped instead of globally true', () => {
  const sql=readFileSync('supabase/migrations/20260926183000_harden_market_scope_and_listing_release.sql','utf8')
  assert.match(sql,/drop policy if exists "market_properties_authenticated_read"/i)
  assert.match(sql,/market_properties_authenticated_scoped_read/i)
  assert.match(sql,/property_assignments/i)
  assert.match(sql,/has_management_profile_scope/i)
  assert.doesNotMatch(sql,/for select[\s\S]{0,100}using \(true\)/i)
})

test('release capability evidence accepts canonical KML, CBRS aggregates, valuations and verified management metrics', () => {
  const sql=readFileSync('supabase/migrations/20260926183000_harden_market_scope_and_listing_release.sql','utf8')
  assert.match(sql,/kml_vitacura_barrios_2026_08_12/i)
  assert.match(sql,/market_supply_sales_intelligence/i)
  assert.match(sql,/cbrs_transactions/i)
  assert.match(sql,/valuation_cases/i)
  assert.match(sql,/valuation_comparables/i)
  assert.match(sql,/quality_status='verified'/i)
  assert.match(sql,/evaluation_status='evaluable'/i)
})
