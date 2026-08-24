import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const reviewMigration = readFileSync(
  'supabase/migrations/20260824164407_add_market_house_territory_review_v1.sql',
  'utf8',
)
const reviewIndexMigration = readFileSync(
  'supabase/migrations/20260824165120_add_market_house_territory_review_indexes.sql',
  'utf8',
)
const reviewRoute = readFileSync('app/api/market/territory-review/route.ts', 'utf8')

test('las revisiones territoriales quedan privadas y trazables', () => {
  assert.match(reviewMigration, /create table if not exists private\.market_listing_territory_reviews/)
  assert.match(reviewMigration, /enable row level security/)
  assert.match(reviewMigration, /revoke all on table private\.market_listing_territory_reviews from public, anon, authenticated/)
  assert.match(reviewMigration, /evidence_type text not null check \(evidence_type in \('explicit_kml_name'\)\)/)
  assert.match(reviewMigration, /reviewed_by uuid not null references public\.profiles\(id\)/)
})

test('la sugerencia exige una única coincidencia explícita', () => {
  assert.match(reviewMigration, /v_address_key like '%' \|\| lower\(regexp_replace/)
  assert.match(reviewMigration, /if v_candidate_count <> 1 or v_candidate_id is distinct from p_neighborhood_id/)
  assert.match(reviewMigration, /Candidate is not uniquely supported by the Portal address/)
})

test('aceptar una sugerencia requiere rol autorizado y AAL2', () => {
  assert.match(reviewMigration, /'admin', 'ceo', 'director', 'subdirector'/)
  assert.match(reviewMigration, /auth\.jwt\(\) ->> 'aal'/)
  assert.match(reviewMigration, /<> 'aal2'/)
  assert.match(reviewRoute, /requireMfaLevel2\(\)/)
  assert.match(reviewRoute, /market\.manage_sources/)
  assert.match(reviewRoute, /properties\.office\.assign/)
})

test('la revisión no modifica la identidad canónica', () => {
  assert.doesNotMatch(reviewMigration, /update public\.market_properties/i)
  assert.doesNotMatch(reviewRoute, /createAdminClient/)
  assert.match(reviewRoute, /review_market_house_territory_v1/)
})

test('las funciones territoriales no quedan expuestas a anon', () => {
  assert.match(reviewMigration, /revoke all on function public\.get_market_house_territory_progress_v1\(\) from public, anon, authenticated/)
  assert.match(reviewMigration, /revoke all on function public\.get_market_house_territory_queue_v1\(\) from public, anon, authenticated/)
  assert.match(reviewMigration, /revoke all on function public\.review_market_house_territory_v1\(uuid, text, uuid, text\) from public, anon, authenticated/)
})

test('las claves foráneas de revisión tienen índices', () => {
  assert.match(reviewIndexMigration, /market_listing_territory_reviews_neighborhood_id_idx/)
  assert.match(reviewIndexMigration, /market_listing_territory_reviews_reviewed_by_idx/)
})
