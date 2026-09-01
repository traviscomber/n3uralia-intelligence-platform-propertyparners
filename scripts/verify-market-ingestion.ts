import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function main() {
  const [route, operational, page, migration, refresh, authMigration] = await Promise.all([
    readFile('app/api/market/import/route.ts', 'utf8'),
    readFile('lib/market-operational.ts', 'utf8'),
    readFile('app/dashboard/market/page.tsx', 'utf8'),
    readFile('supabase/migrations/202607300210_canonical_market_aggregate_ingestion_rpc.sql', 'utf8'),
    readFile('app/api/cron/market-refresh/route.ts', 'utf8'),
    readFile('supabase/migrations/202608162125_portal_ingestion_service_role_grant_authorization.sql', 'utf8'),
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
  assert.match(page, /latestIngestionAccepted/, 'Market dashboard must display accepted ingestion counts.')
  assert.match(page, /latestIngestionRejected/, 'Market dashboard must display rejected ingestion counts.')
  assert.match(page, /Corte desactualizado/, 'Market dashboard must warn when data is stale.')
  assert.match(refresh, /completedDatasets === DATASETS\.length/, 'Refresh must require every configured Portal dataset to complete.')
  assert.match(refresh, /totalFailures === 0/, 'Refresh must fail closed when any dataset fails.')
  assert.match(refresh, /skippedForRuntimeBudget === 0/, 'Refresh must not report success after runtime-budget skips.')
  assert.match(refresh, /skippedForLock === 0/, 'Refresh must not report success after ingestion-lock skips.')

  assert.match(authMigration, /revoke all on function public\.ingest_portal_listing_snapshot_v2[\s\S]*from public/i, 'Portal ingestion must not be executable by public.')
  assert.match(authMigration, /from anon/i, 'Portal ingestion must revoke anon execution.')
  assert.match(authMigration, /from authenticated/i, 'Portal ingestion must revoke authenticated execution.')
  assert.match(authMigration, /grant execute on function public\.ingest_portal_listing_snapshot_v2[\s\S]*to service_role/i, 'Portal ingestion must be executable by service_role.')
  assert.doesNotMatch(authMigration, /raise exception 'Expected legacy service_role JWT guard was not found'/, 'Authorization migration must remain idempotent after production application.')

  console.log('Canonical market ingestion verification passed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})