import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function main() {
  const [route, operational, page, migration, refresh, authMigration, proxy, smoke] = await Promise.all([
    readFile('app/api/market/import/route.ts', 'utf8'),
    readFile('lib/market-operational.ts', 'utf8'),
    readFile('app/dashboard/market/page.tsx', 'utf8'),
    readFile('supabase/migrations/202607300210_canonical_market_aggregate_ingestion_rpc.sql', 'utf8'),
    readFile('app/api/cron/market-refresh/route.ts', 'utf8'),
    readFile('supabase/migrations/202608162125_portal_ingestion_service_role_grant_authorization.sql', 'utf8'),
    readFile('lib/supabase/proxy.ts', 'utf8'),
    readFile('app/api/internal/portal-collector-smoke/route.ts', 'utf8'),
  ])

  assert.match(route, /rpc\('ingest_market_aggregate'/, 'Market import must call the canonical ingestion RPC.')
  assert.doesNotMatch(route, /from\('market_data'\)/, 'Market import must not write aggregate data to the legacy market_data table.')
  assert.match(route, /source_system/, 'Market import must preserve the source system.')
  assert.match(migration, /market_ingestion_runs/, 'Pipeline must create ingestion runs.')
  assert.match(migration, /market_raw_records/, 'Pipeline must preserve raw records.')
  assert.match(migration, /validation_errors/, 'Pipeline must persist explicit validation errors.')
  assert.match(migration, /market_metric_snapshots/, 'Accepted aggregate rows must materialize canonical snapshots.')
  assert.match(migration, /market_aggregate/, 'Aggregate imports must use an explicit dataset kind.')
  assert.match(operational, /latestIngestionAt/, 'Operational snapshot must expose ingestion freshness.')
  assert.match(page, /DataStatusBar/, 'Market dashboard must render a canonical data-status surface.')
  assert.match(page, /latestIngestionAt/, 'Market dashboard must display the latest ingestion timestamp.')
  assert.match(page, /latestPortalReportedCount/, 'Market dashboard must display the result count reported by Portal.')
  assert.match(page, /latestInventoryCoverageRatio/, 'Market dashboard must display measured coverage against Portal.')
  assert.match(page, /Corte desactualizado/, 'Market dashboard must warn when data is stale.')
  assert.match(refresh, /completeInventories === DATASETS\.length/, 'Refresh must require a complete daily inventory for every configured Portal dataset.')
  assert.match(refresh, /totalFailures === 0/, 'Refresh must fail closed when complete inventory discovery fails.')
  assert.match(refresh, /MAX_DISCOVERY_PAGES = 40/, 'Portal inventory discovery must have enough page capacity for the full Vitacura market.')
  assert.match(refresh, /inventory\.discovery\.exhausted/, 'Complete inventory must require proven search exhaustion.')
  assert.match(refresh, /!inventory\.discovery\.capped/, 'Complete inventory must fail closed when the discovery page limit is reached.')
  assert.match(refresh, /coverageRatio >= 0\.97/, 'Complete inventory must cover at least 97% of the result count reported by Portal.')
  assert.match(refresh, /coverageRatio <= 1\.05/, 'Complete inventory must reject implausible over-collection against Portal.')
  assert.match(refresh, /portal_reported_result_count/, 'Inventory runs must preserve Portal reported result counts.')
  assert.match(refresh, /portal_inventory_discovery_v1/, 'Inventory presence must have a distinct canonical pipeline identity.')
  assert.match(refresh, /from\('market_raw_records'\)/, 'Complete inventory members must be persisted as raw canonical evidence.')
  assert.match(refresh, /p_full_snapshot: false/, 'Bounded detail enrichment must never mark unseen market listings as removed.')
  assert.match(operational, /portal_inventory_discovery_v1/, 'Active inventory must derive from the latest complete inventory discovery run.')
  assert.match(page, /Deduplicación canónica/, 'Market dashboard must expose canonical deduplication as a first-class metric.')
  assert.match(page, /confirmedDuplicateRows/, 'Market dashboard must show the number of confirmed duplicate rows.')
  assert.match(page, /logicalHouseComponents/, 'Market dashboard must show the clean logical-property universe.')
  assert.match(page, /latestDiscoveryDuplicateCandidates/, 'Market dashboard must expose daily discovery deduplication separately from canonical identity deduplication.')
  assert.match(refresh, /discovery_duplicate_candidates/, 'Portal refresh must persist daily discovery duplicate counts for auditability.')
  assert.match(page, /Portal reporta/, 'Market dashboard must make the Portal-reported universe visible.')
  assert.match(page, /IDs únicos/, 'Market dashboard must distinguish unique listing IDs from raw references.')

  assert.match(authMigration, /revoke all on function public\.ingest_portal_listing_snapshot_v2[\s\S]*from public/i, 'Portal ingestion must not be executable by public.')
  assert.match(authMigration, /from anon/i, 'Portal ingestion must revoke anon execution.')
  assert.match(authMigration, /from authenticated/i, 'Portal ingestion must revoke authenticated execution.')
  assert.match(proxy, /portal-collector-smoke[\s\S]*VERCEL_ENV !== 'production'/, 'Collector smoke may bypass session auth only outside production.')
  assert.match(smoke, /VERCEL_ENV === 'production'[\s\S]*status: 404/, 'Collector smoke must remain unavailable in production.')
  assert.doesNotMatch(smoke, /supabase|insert\(|update\(|delete\(/i, 'Collector smoke must remain read-only.')

  assert.match(authMigration, /grant execute on function public\.ingest_portal_listing_snapshot_v2[\s\S]*to service_role/i, 'Portal ingestion must be executable by service_role.')
  assert.doesNotMatch(authMigration, /raise exception 'Expected legacy service_role JWT guard was not found'/, 'Authorization migration must remain idempotent after production application.')

  console.log('Canonical market ingestion verification passed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})